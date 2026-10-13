/**
 * Nexus Desktop — main process (Electron).
 *
 * Production-quality Electron browser shell. Manages:
 *   - BrowserWindow with secure webPreferences (contextIsolation, sandbox, no nodeIntegration)
 *   - BrowserView-based tab system (TabManager)
 *   - Session partitions for normal + incognito (SessionManager)
 *   - Network-level ad blocker (AdBlocker)
 *   - Download manager (DownloadManager)
 *   - Settings persistence (SettingsStore)
 *   - First-run detection (FirstRun)
 *   - Auto-updater (UpdateService)
 *   - Single-instance lock + protocol handler
 *
 * Run in development:  electron .
 * Build the installer: npx electron-builder --win --x64
 */

'use strict';

const { app, BrowserWindow, ipcMain, shell, nativeTheme, systemPreferences } = require('electron');
const path = require('path');
const fs = require('fs');
const { UpdateService } = require('./updater');
const { SettingsStore } = require('./lib/SettingsStore');
const { FirstRun } = require('./lib/FirstRun');
const { SessionManager, NORMAL_PARTITION } = require('./lib/SessionManager');
const { TabManager } = require('./lib/TabManager');
const { AdBlocker } = require('./lib/AdBlocker');
const { DownloadManager } = require('./lib/DownloadManager');
const { normalizeUrl, isUrl } = require('./lib/url-utils');

const PACKAGE = require(path.join(__dirname, '..', 'package.json'));
const NEXUS_VERSION = PACKAGE.version || '1.0.0';

const USER_DATA_DIR = app.getPath('userData');
const WINDOW_STATE_FILE = path.join(USER_DATA_DIR, 'window-state.json');
const RECOVERY_FILE = path.join(USER_DATA_DIR, 'recovery.json');
const NEXUS_SCHEME = 'nexus';

let mainWindow = null;
let updater = null;
let settings = null;
let firstRun = null;
let sessionManager = null;
let adBlocker = null;
let downloadManager = null;
let tabManager = null;

/* ---- Window state persistence ---- */
function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(WINDOW_STATE_FILE, 'utf8'));
  } catch {
    return { width: 1280, height: 800, x: undefined, y: undefined, maximized: false };
  }
}

function saveWindowState(win) {
  if (!win || win.isDestroyed()) return;
  try {
    const bounds = win.getBounds();
    fs.writeFileSync(WINDOW_STATE_FILE, JSON.stringify({
      ...bounds,
      maximized: win.isMaximized(),
    }, null, 2));
  } catch {}
}

/* ---- Recovery flag (crash detection) ---- */
function markRunning() {
  try { fs.writeFileSync(RECOVERY_FILE, JSON.stringify({ running: true, at: new Date().toISOString() })); } catch {}
}
function markClean() {
  try { fs.writeFileSync(RECOVERY_FILE, JSON.stringify({ running: false, at: new Date().toISOString() })); } catch {}
}

/* ---- Create the main Nexus window ---- */
function createWindow() {
  const state = loadWindowState();
  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 720,
    minHeight: 480,
    backgroundColor: '#070a14',
    show: false,
    title: 'Nexus',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: true,
      spellcheck: true,
      partition: NORMAL_PARTITION,
    },
  });

  if (state.maximized) win.maximize();

  win.once('ready-to-show', () => {
    win.show();
    markRunning();
  });

  win.on('close', () => saveWindowState(win));
  win.on('resize', () => {
    saveWindowState(win);
    if (tabManager) tabManager.resizeActive(win.getContentBounds());
  });
  win.on('move', () => saveWindowState(win));
  win.on('maximize', () => {
    if (tabManager) tabManager.resizeActive(win.getContentBounds());
  });
  win.on('unmaximize', () => {
    if (tabManager) tabManager.resizeActive(win.getContentBounds());
  });

  // External links from the UI renderer open in the OS default browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'deny' };
  });

  // Load the renderer (web app). In dev: the Vite dev server. In production:
  // the bundled dist or the published URL.
  const target = process.env.VITE_APP_URL || process.env.DEV_SERVER_URL || 'https://nexus.base44.app';
  win.loadURL(target).catch((e) => {
    console.error('[main] Failed to load renderer:', e.message);
  });

  return win;
}

/* ---- Single instance lock ---- */
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (event, argv) => {
    const url = argv.find((a) => /^nexus:|^https?:/i.test(a));
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      if (url) mainWindow.webContents.send('nexus:open-url', url);
    }
    event.preventDefault();
  });
}

/* ---- App ready ---- */
app.whenReady().then(() => {
  app.setAsDefaultProtocolClient(NEXUS_SCHEME);

  // Initialize core services.
  settings = new SettingsStore(USER_DATA_DIR);
  firstRun = new FirstRun(USER_DATA_DIR);
  sessionManager = new SessionManager();
  adBlocker = new AdBlocker(settings);
  downloadManager = new DownloadManager(settings);

  mainWindow = createWindow();

  // Initialize the tab manager (needs the window).
  tabManager = new TabManager(mainWindow, sessionManager, adBlocker, downloadManager);

  // Push tab events to the renderer.
  tabManager.onChange((evt) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('nexus:tab-event', evt);
    }
  });

  downloadManager.onChange((evt) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('nexus:download-event', evt);
    }
  });

  // OS theme detection.
  const sendNativeTheme = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('nexus:os-theme', {
        dark: nativeTheme.shouldUseDarkColors,
        highContrast: nativeTheme.shouldUseHighContrastColors,
        accent: (() => { try { return systemPreferences.getAccentColor(); } catch { return null; } })(),
      });
    }
  };
  nativeTheme.on('updated', sendNativeTheme);
  sendNativeTheme();

  // Real updater lifecycle.
  updater = new UpdateService(mainWindow);
  updater.start();

  // Create the first tab (new-tab page or continue-session).
  // The renderer will drive tab creation after this; this is the initial tab.
  tabManager.create({ url: null, active: true });
});

/* ---- Lifecycle ---- */
app.on('before-quit', async () => {
  markClean();
  if (updater) updater.dispose();
  if (tabManager) tabManager.destroyAll();
  if (sessionManager) await sessionManager.destroyAllIncognito();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow();
  }
});

/* ---- IPC: System ---- */
ipcMain.handle('nexus:system:info', async () => ({
  platform: process.platform,
  arch: process.arch,
  version: NEXUS_VERSION,
  electronVersion: process.versions.electron,
  chromeVersion: process.versions.chrome,
  userDataDir: USER_DATA_DIR,
}));

ipcMain.handle('nexus:system:open-external', async (_e, url) => {
  if (typeof url !== 'string' || !/^https?:/i.test(url)) return false;
  return shell.openExternal(url);
});

ipcMain.handle('nexus:system:default-browser-status', async () => {
  return app.isDefaultProtocolClient('http') || app.isDefaultProtocolClient('https');
});

ipcMain.handle('nexus:system:set-default-browser', async () => {
  const http = app.setAsDefaultProtocolClient('http');
  const https = app.setAsDefaultProtocolClient('https');
  return http && https;
});

/* ---- IPC: Tabs ---- */
ipcMain.handle('nexus:tabs:create', async (_e, opts) => {
  const id = tabManager.create(opts || {});
  return tabManager.getTab(id);
});

ipcMain.handle('nexus:tabs:close', async (_e, tabId) => {
  tabManager.close(tabId);
  return tabManager.getTabs();
});

ipcMain.handle('nexus:tabs:activate', async (_e, tabId) => {
  tabManager.activate(tabId);
  return tabManager.getTab(tabId);
});

ipcMain.handle('nexus:tabs:navigate', async (_e, tabId, input) => {
  // Resolve the input: URL vs search query.
  const url = normalizeUrl(input);
  if (url) {
    tabManager.navigate(tabId, url);
  } else {
    // It's a search query — route to the configured search engine.
    const engine = settings.get('searchEngine') || 'nexus';
    const custom = settings.get('customSearchUrl') || '';
    const searchUrl = buildSearchUrl(engine, input, custom);
    tabManager.navigate(tabId, searchUrl);
  }
  return tabManager.getTab(tabId);
});

ipcMain.handle('nexus:tabs:goBack', async (_e, tabId) => { tabManager.goBack(tabId); return tabManager.getTab(tabId); });
ipcMain.handle('nexus:tabs:goForward', async (_e, tabId) => { tabManager.goForward(tabId); return tabManager.getTab(tabId); });
ipcMain.handle('nexus:tabs:reload', async (_e, tabId) => { tabManager.reload(tabId); return null; });
ipcMain.handle('nexus:tabs:stop', async (_e, tabId) => { tabManager.stop(tabId); return null; });
ipcMain.handle('nexus:tabs:togglePin', async (_e, tabId) => { tabManager.togglePin(tabId); return tabManager.getTabs(); });
ipcMain.handle('nexus:tabs:duplicate', async (_e, tabId) => { const id = tabManager.duplicate(tabId); return tabManager.getTab(id); });
ipcMain.handle('nexus:tabs:list', async () => tabManager.getTabs());
ipcMain.handle('nexus:tabs:getActive', async () => tabManager.getActiveId());

/* ---- IPC: Downloads ---- */
ipcMain.handle('nexus:downloads:list', async () => downloadManager.getAll());
ipcMain.handle('nexus:downloads:cancel', async (_e, id) => { downloadManager.cancel(id); return null; });
ipcMain.handle('nexus:downloads:open', async (_e, id) => { downloadManager.openFile(id); return null; });
ipcMain.handle('nexus:downloads:show', async (_e, id) => { downloadManager.showInFolder(id); return null; });

/* ---- IPC: Ad Blocker ---- */
ipcMain.handle('nexus:adblock:isEnabled', async () => adBlocker.isEnabled());
ipcMain.handle('nexus:adblock:setEnabled', async (_e, on) => { adBlocker.setEnabled(on); return adBlocker.isEnabled(); });
ipcMain.handle('nexus:adblock:stats', async () => adBlocker.getStats());
ipcMain.handle('nexus:adblock:addException', async (_e, host) => { adBlocker.addSiteException(host); return null; });
ipcMain.handle('nexus:adblock:removeException', async (_e, host) => { adBlocker.removeSiteException(host); return null; });
ipcMain.handle('nexus:adblock:hasException', async (_e, host) => adBlocker.hasException(host));

/* ---- IPC: Settings ---- */
ipcMain.handle('nexus:settings:get', async (_e, key) => settings.get(key));
ipcMain.handle('nexus:settings:getAll', async () => settings.getAll());
ipcMain.handle('nexus:settings:set', async (_e, key, value) => { settings.set(key, value); return settings.getAll(); });
ipcMain.handle('nexus:settings:setMany', async (_e, patch) => { settings.setMany(patch); return settings.getAll(); });
ipcMain.handle('nexus:settings:reset', async () => { settings.reset(); return settings.getAll(); });

/* ---- IPC: First Run ---- */
ipcMain.handle('nexus:firstrun:isPending', async () => firstRun.isPending());
ipcMain.handle('nexus:firstrun:complete', async () => { firstRun.complete(); return null; });
ipcMain.handle('nexus:firstrun:reset', async () => { firstRun.reset(); return null; });

/* ---- IPC: Incognito ---- */
ipcMain.handle('nexus:incognito:list', async () => sessionManager.listIncognito());
ipcMain.handle('nexus:incognito:destroyAll', async () => { await sessionManager.destroyAllIncognito(); return null; });

/* ---- Helpers ---- */
function buildSearchUrl(engine, query, customSearchUrl) {
  const q = encodeURIComponent(query);
  switch (engine) {
    case 'google': return `https://www.google.com/search?q=${q}`;
    case 'bing': return `https://www.bing.com/search?q=${q}`;
    case 'duckduckgo': return `https://duckduckgo.com/?q=${q}`;
    case 'brave': return `https://search.brave.com/search?q=${q}`;
    case 'custom':
      if (customSearchUrl) return customSearchUrl.replace(/\{searchTerms\}|\{query\}|%s/g, q);
      return `https://www.google.com/search?q=${q}`;
    case 'nexus':
    default:
      return `nexus://search?q=${q}`;
  }
}