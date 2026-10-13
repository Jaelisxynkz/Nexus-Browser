/**
 * TabManager — BrowserView-based tab lifecycle management.
 *
 * Each tab is a BrowserView attached to a BrowserWindow. The BrowserView
 * holds the actual web content (a real Chromium webContents, not an iframe).
 * The React renderer sends IPC commands (create, navigate, close, back,
 * forward, reload); the main process manages the BrowserViews and pushes
 * events (title-changed, loading, favicon, navigation-state) back.
 *
 * Key guarantees:
 *   - Closing a tab destroys its webContents and releases its session ref.
 *   - No destroyed webContents is ever referenced after cleanup.
 *   - Only the active tab's BrowserView is visible; others are hidden.
 *   - Incognito tabs use ephemeral session partitions (see SessionManager).
 */

'use strict';

const { BrowserView } = require('electron');

let nextTabId = 1;

class TabManager {
  constructor(window, sessionManager, adBlocker, downloadManager) {
    this._window = window;
    this._sessionManager = sessionManager;
    this._adBlocker = adBlocker;
    this._downloadManager = downloadManager;

    // Map<tabId, { view, partition, incognito, pinned, ... }>
    this._tabs = new Map();
    this._activeId = null;
    this._listeners = new Set();
  }

  /** Subscribe to tab events. Returns an unsubscribe function. */
  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _emit(evt) {
    this._listeners.forEach((fn) => fn(evt));
  }

  _snapshot(tabId) {
    const t = this._tabs.get(tabId);
    if (!t) return null;
    return {
      id: tabId,
      url: t.view.webContents.getURL(),
      title: t.view.webContents.title || '',
      incognito: t.incognito,
      pinned: t.pinned,
      loading: t.view.webContents.isLoading(),
      canGoBack: t.view.webContents.navigationHistory.canGoBack(),
      canGoForward: t.view.webContents.navigationHistory.canGoForward(),
    };
  }

  _allSnapshots() {
    const order = [];
    for (const [id, t] of this._tabs) {
      order.push({
        id,
        url: t.view.webContents.getURL(),
        title: t.view.webContents.title || '',
        incognito: t.incognito,
        pinned: t.pinned,
        loading: t.view.webContents.isLoading(),
      });
    }
    return order;
  }

  _attachListeners(tabId, view) {
    const wc = view.webContents;

    wc.on('did-start-loading', () => this._emit({ type: 'tab-loading', tabId, loading: true }));
    wc.on('did-stop-loading', () => this._emit({ type: 'tab-loading', tabId, loading: false }));
    wc.on('page-title-updated', (_e, title) => this._emit({ type: 'tab-title', tabId, title }));
    wc.on('page-favicon-updated', (_e, favicons) => this._emit({ type: 'tab-favicon', tabId, favicon: favicons[0] || null }));
    wc.on('did-navigate', (_e, url) => {
      this._emit({ type: 'tab-navigated', tabId, url });
      this._emitNavState(tabId);
    });
    wc.on('did-navigate-in-page', (_e, url) => {
      this._emit({ type: 'tab-navigated', tabId, url });
      this._emitNavState(tabId);
    });
    wc.on('navigation-state-changed', () => this._emitNavState(tabId));

    // New window / popup handling — open in a new tab, not a new Electron window.
    wc.setWindowOpenHandler(({ url }) => {
      this.create({ url, incognito: this._tabs.get(tabId)?.incognito });
      return { action: 'deny' };
    });

    // Download handling — delegate to DownloadManager.
    wc.session.on('will-download', (_e, item, webContents) => {
      if (this._downloadManager) {
        this._downloadManager.handleDownload(item, webContents);
      }
    });

    // Permission requests — explicit user consent for camera/mic/etc.
    wc.session.setPermissionRequestHandler((_webContents, permission, callback) => {
      // Default: allow common safe permissions, deny sensitive ones.
      const safe = new Set(['notifications', 'clipboard-read', 'clipboard-sanitized-write']);
      const sensitive = new Set(['media', 'camera', 'microphone', 'geolocation']);
      if (sensitive.has(permission)) {
        // In production, show a permission dialog. For now, deny sensitive.
        callback(false);
      } else if (safe.has(permission)) {
        callback(true);
      } else {
        callback(true);
      }
    });
  }

  _emitNavState(tabId) {
    const t = this._tabs.get(tabId);
    if (!t || t.view.webContents.isDestroyed()) return;
    this._emit({
      type: 'tab-nav-state',
      tabId,
      canGoBack: t.view.webContents.navigationHistory.canGoBack(),
      canGoForward: t.view.webContents.navigationHistory.canGoForward(),
      url: t.view.webContents.getURL(),
    });
  }

  /**
   * Create a new tab. If `url` is provided, navigate to it; otherwise load
   * the new-tab page. If `incognito` is true, use a fresh ephemeral session.
   * Returns the new tab id.
   */
  create({ url, incognito = false, active = true } = {}) {
    const tabId = nextTabId++;
    const partition = incognito
      ? this._sessionManager.createIncognitoPartition()
      : 'persist:nexus-normal';

    const ses = this._sessionManager.get(partition);
    this._sessionManager.acquire(partition, tabId);

    // Attach the ad blocker to this session.
    if (this._adBlocker) {
      this._adBlocker.attachToSession(ses);
    }

    const view = new BrowserView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        session: ses,
        preload: undefined, // no preload for web content — only for our UI
      },
    });

    this._window.setBrowserView(view);
    this._tabs.set(tabId, { view, partition, incognito, pinned: false });

    this._attachListeners(tabId, view);

    const target = url || 'nexus://start';
    if (target.startsWith('nexus://')) {
      // Internal pages are rendered by the main UI, not a BrowserView.
      // We emit a navigate event so the renderer shows the internal view.
      this._emit({ type: 'tab-navigated', tabId, url: target });
    } else {
      view.webContents.loadURL(target);
    }

    if (active) this.activate(tabId);

    this._emit({ type: 'tab-created', tab: this._snapshot(tabId), tabs: this._allSnapshots() });
    return tabId;
  }

  /** Activate a tab — show its BrowserView, hide all others. */
  activate(tabId) {
    this._activeId = tabId;
    const active = this._tabs.get(tabId);
    if (!active) return;

    // Hide all views, show the active one.
    for (const [id, t] of this._tabs) {
      if (id === tabId) {
        this._window.setBrowserView(t.view);
        t.view.setBounds({ x: 0, y: 80, width: this._window.getContentBounds().width, height: this._window.getContentBounds().height - 80 });
        t.view.setAutoResize({ width: true, height: true, x: false, y: false });
      } else {
        this._window.setBrowserView(null);
      }
    }

    this._emit({ type: 'tab-activated', tabId, tabs: this._allSnapshots() });
  }

  /** Navigate a tab to a URL. */
  navigate(tabId, url) {
    const t = this._tabs.get(tabId);
    if (!t || t.view.webContents.isDestroyed()) return;
    if (url.startsWith('nexus://')) {
      this._emit({ type: 'tab-navigated', tabId, url });
    } else {
      t.view.webContents.loadURL(url);
    }
  }

  /** Go back in the tab's history. */
  goBack(tabId) {
    const t = this._tabs.get(tabId);
    if (!t || t.view.webContents.isDestroyed()) return;
    if (t.view.webContents.navigationHistory.canGoBack()) t.view.webContents.navigationHistory.goBack();
  }

  /** Go forward in the tab's history. */
  goForward(tabId) {
    const t = this._tabs.get(tabId);
    if (!t || t.view.webContents.isDestroyed()) return;
    if (t.view.webContents.navigationHistory.canGoForward()) t.view.webContents.navigationHistory.goForward();
  }

  /** Reload the active tab. */
  reload(tabId) {
    const t = this._tabs.get(tabId);
    if (!t || t.view.webContents.isDestroyed()) return;
    t.view.webContents.reload();
  }

  /** Stop loading. */
  stop(tabId) {
    const t = this._tabs.get(tabId);
    if (!t || t.view.webContents.isDestroyed()) return;
    t.view.webContents.stop();
  }

  /** Toggle pin state. */
  togglePin(tabId) {
    const t = this._tabs.get(tabId);
    if (!t) return;
    t.pinned = !t.pinned;
    this._emit({ type: 'tab-pinned', tabId, pinned: t.pinned, tabs: this._allSnapshots() });
  }

  /** Duplicate a tab (opens the same URL in a new tab). */
  duplicate(tabId) {
    const t = this._tabs.get(tabId);
    if (!t) return;
    const url = t.view.webContents.getURL();
    return this.create({ url, incognito: t.incognito });
  }

  /**
   * Close a tab. Destroys the BrowserView and releases the session ref.
   * If it was the active tab, activates the nearest remaining tab.
   */
  close(tabId) {
    const t = this._tabs.get(tabId);
    if (!t) return;

    // Destroy the webContents and remove the BrowserView.
    if (!t.view.webContents.isDestroyed()) {
      t.view.webContents.destroy();
    }
    this._window.setBrowserView(null);

    // Release the session partition (this may destroy an incognito session).
    this._sessionManager.release(t.partition, tabId);
    this._tabs.delete(tabId);

    // Activate the nearest remaining tab.
    if (this._activeId === tabId) {
      const remaining = [...this._tabs.keys()];
      if (remaining.length > 0) {
        this.activate(remaining[remaining.length - 1]);
      } else {
        this._activeId = null;
      }
    }

    this._emit({ type: 'tab-closed', tabId, tabs: this._allSnapshots() });
  }

  /** Get the active tab id. */
  getActiveId() { return this._activeId; }

  /** Get snapshot of all tabs. */
  getTabs() { return this._allSnapshots(); }

  /** Get snapshot of a single tab. */
  getTab(tabId) { return this._snapshot(tabId); }

  /** Destroy all tabs (on app quit). */
  destroyAll() {
    for (const [tabId, t] of this._tabs) {
      if (!t.view.webContents.isDestroyed()) t.view.webContents.destroy();
      this._sessionManager.release(t.partition, tabId);
    }
    this._tabs.clear();
    this._activeId = null;
  }

  /** Resize the active BrowserView to match the window content area. */
  resizeActive(contentBounds) {
    const t = this._tabs.get(this._activeId);
    if (!t) return;
    t.view.setBounds({
      x: 0,
      y: 80, // below the tab bar + nav bar
      width: contentBounds.width,
      height: contentBounds.height - 80,
    });
  }
}

module.exports = { TabManager };