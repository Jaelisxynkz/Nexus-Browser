/**
 * useDesktopBrowser — Electron-backed browser hook.
 *
 * When Nexus runs inside the native desktop shell, this hook replaces the
 * iframe-based web browser with real BrowserView tabs managed by the main
 * process. All tab operations (create, close, navigate, back, forward,
 * reload, pin, duplicate) are sent over IPC; tab state (title, loading,
 * URL, favicon, navigation state) is pushed back as events.
 *
 * The returned interface matches useBrowser (web mode) so the rest of the
 * UI (TabBar, NavBar, Home) works unchanged in both environments.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { bridgeOrNull } from "./desktopRuntime";

export function faviconFor(url) {
  try {
    const u = new URL(url.startsWith("http") ? url : "https://example.com");
    return "https://www.google.com/s2/favicons?domain=" + u.hostname + "&sz=64";
  } catch {
    return null;
  }
}

const HOME_TAB = {
  id: 1,
  url: "nexus://start",
  title: "New Tab",
  history: ["nexus://start"],
  hIndex: 0,
  loading: false,
  incognito: false,
  pinned: false,
};

export default function useDesktopBrowser() {
  const nexus = bridgeOrNull();
  const [tabs, setTabs] = useState([HOME_TAB]);
  const [activeId, setActiveIdState] = useState(1);
  const [recentlyClosed, setRecentlyClosed] = useState([]);
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  const active = tabs.find((t) => t.id === activeId) || tabs[0] || HOME_TAB;

  // Initialize from the main process and subscribe to tab events.
  useEffect(() => {
    if (!nexus) return;

    // Sync the current tab list + active id.
    nexus.tabs.list().then((list) => {
      if (list && list.length > 0) {
        const enriched = list.map((t) => ({
          ...t,
          history: [t.url],
          hIndex: 0,
          favicon: faviconFor(t.url),
        }));
        setTabs(enriched);
        nexus.tabs.getActive().then((id) => { if (id) setActiveIdState(id); });
      }
    }).catch(() => {});

    // Subscribe to tab events pushed from the main process.
    const unsub = nexus.tabs.onEvent((evt) => {
      switch (evt.type) {
        case "tab-created":
          if (evt.tabs) {
            setTabs(evt.tabs.map((t) => ({
              ...t,
              history: [t.url],
              hIndex: 0,
              favicon: faviconFor(t.url),
            })));
          }
          if (evt.tab) {
            setActiveIdState(evt.tab.id);
          }
          break;
        case "tab-closed":
          if (evt.tabs) {
            setTabs(evt.tabs.map((t) => ({
              ...t,
              history: [t.url],
              hIndex: 0,
              favicon: faviconFor(t.url),
            })));
          }
          break;
        case "tab-activated":
          if (evt.tabs) {
            setTabs(evt.tabs.map((t) => ({
              ...t,
              history: [t.url],
              hIndex: 0,
              favicon: faviconFor(t.url),
            })));
          }
          setActiveIdState(evt.tabId);
          break;
        case "tab-title":
          setTabs((prev) => prev.map((t) => (t.id === evt.tabId ? { ...t, title: evt.title } : t)));
          break;
        case "tab-loading":
          setTabs((prev) => prev.map((t) => (t.id === evt.tabId ? { ...t, loading: evt.loading } : t)));
          break;
        case "tab-navigated":
          setTabs((prev) => prev.map((t) => {
            if (t.id !== evt.tabId) return t;
            const history = [...(t.history || []), evt.url];
            return { ...t, url: evt.url, history, hIndex: history.length - 1, favicon: faviconFor(evt.url) };
          }));
          break;
        case "tab-nav-state":
          setTabs((prev) => prev.map((t) => (t.id === evt.tabId ? {
            ...t,
            url: evt.url,
            canGoBack: evt.canGoBack,
            canGoForward: evt.canGoForward,
          } : t)));
          break;
        case "tab-favicon":
          setTabs((prev) => prev.map((t) => (t.id === evt.tabId ? { ...t, favicon: evt.favicon } : t)));
          break;
        case "tab-pinned":
          if (evt.tabs) {
            setTabs(evt.tabs.map((t) => ({
              ...t,
              history: [t.url],
              hIndex: 0,
              favicon: faviconFor(t.url),
            })));
          }
          break;
        default:
          break;
      }
    });

    return unsub;
  }, [nexus]);

  // --- Operations (all via IPC) ---

  const navigate = useCallback((input, tabId) => {
    const id = tabId ?? activeId;
    if (!nexus || id == null) return;
    nexus.tabs.navigate(id, input);
  }, [activeId, nexus]);

  const goBack = useCallback(() => {
    if (!nexus || activeId == null) return;
    nexus.tabs.goBack(activeId);
  }, [activeId, nexus]);

  const goForward = useCallback(() => {
    if (!nexus || activeId == null) return;
    nexus.tabs.goForward(activeId);
  }, [activeId, nexus]);

  const reload = useCallback(() => {
    if (!nexus || activeId == null) return;
    nexus.tabs.reload(activeId);
  }, [activeId, nexus]);

  const goHome = useCallback(() => {
    navigate("nexus://start");
  }, [navigate]);

  const newTab = useCallback((opts = {}) => {
    if (!nexus) return null;
    return nexus.tabs.create(opts);
  }, [nexus]);

  const closeTab = useCallback((id) => {
    if (!nexus || id == null) return;
    // Track for recently closed.
    const closing = tabsRef.current.find((t) => t.id === id);
    if (closing) setRecentlyClosed((rc) => [{ ...closing }, ...rc].slice(0, 12));
    nexus.tabs.close(id);
  }, [nexus]);

  const setActiveId = useCallback((id) => {
    if (!nexus || id == null) return;
    nexus.tabs.activate(id);
  }, [nexus]);

  const togglePin = useCallback((id) => {
    if (!nexus || id == null) return;
    nexus.tabs.togglePin(id);
  }, [nexus]);

  const duplicateTab = useCallback((id) => {
    if (!nexus || id == null) return;
    return nexus.tabs.duplicate(id);
  }, [nexus]);

  const restoreTab = useCallback((t) => {
    if (!nexus || !t) return;
    const id = nexus.tabs.create({ url: t.url, incognito: t.incognito });
    setRecentlyClosed((rc) => rc.filter((x) => x.id !== t.id));
    return id;
  }, [nexus]);

  const openTabs = useCallback((list, _opts = {}) => {
    if (!nexus) return;
    const valid = (list || []).filter((t) => t && t.url);
    valid.forEach((t) => nexus.tabs.create({ url: t.url, incognito: t.incognito, active: false }));
    if (valid[0]) nexus.tabs.create({ url: valid[0].url, incognito: valid[0].incognito, active: true });
  }, [nexus]);

  const closeMany = useCallback((ids, keepId) => {
    if (!nexus) return;
    ids.forEach((id) => nexus.tabs.close(id));
  }, [nexus]);

  return {
    tabs,
    active,
    activeId,
    setActiveId,
    navigate,
    goBack,
    goForward,
    reload,
    goHome,
    newTab,
    closeTab,
    togglePin,
    duplicateTab,
    restoreTab,
    openTabs,
    closeMany,
    recentlyClosed,
  };
}