import { useState, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNexusSettings } from "./useNexusSettings";
import { resolveInput } from "./searchEngine";
import { isPrivateActive } from "./privacyEngine";
import { getSetting } from "./services";
import { isDesktopRuntime } from "./desktopRuntime";
import useDesktopBrowser from "./useDesktopBrowser";

let nextId = 2;

const HOME = {
  id: 1,
  url: "nexus://start",
  title: "Nexus Browser",
  history: ["nexus://start"],
  hIndex: 0,
  loading: false,
};

function normalize(input, settings) {
  if (!settings) {
    // Fallback (kept for any external caller without a settings context)
    const v = input.trim();
    if (!v) return null;
    if (v.startsWith("nexus://")) return v;
    const isUrl = /^https?:\/\//i.test(v);
    const looksDomain = /^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(v) && !v.includes(" ");
    if (isUrl) return v;
    if (looksDomain) return "https://" + v;
    return "https://www.google.com/search?igu=1&q=" + encodeURIComponent(v);
  }
  return resolveInput(input, {
    engine: settings.searchEngine || "nexus",
    customSearchUrl: settings.customSearchUrl,
  });
}

export function faviconFor(url) {
  try {
    const u = new URL(url.startsWith("http") ? url : "https://example.com");
    return "https://www.google.com/s2/favicons?domain=" + u.hostname + "&sz=64";
  } catch {
    return null;
  }
}

function useWebBrowser() {
  const { settings } = useNexusSettings();
  const [tabs, setTabs] = useState([HOME]);
  const [activeId, setActiveId] = useState(1);
  const [recentlyClosed, setRecentlyClosed] = useState([]);
  const active = tabs.find((t) => t.id === activeId) || tabs[0];
  const timers = useRef({});

  const patchTab = useCallback((id, patch) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const logHistory = useCallback((url, title, tabIncognito) => {
    if (!url.startsWith("http")) return;
    // Never write incognito visits (per-tab flag or global private session) to history.
    if (tabIncognito || isPrivateActive()) return;
    base44.entities.HistoryEntry.create({
      url,
      title: title || url,
      favicon: faviconFor(url),
      visited_at: new Date().toISOString(),
    }).catch(() => {});
  }, []);

  const navigate = useCallback(
    (raw, tabId) => {
      const id = tabId ?? activeId;
      let url = normalize(raw, settings);
      if (!url) return;
      // HTTPS-Only Strict: refuse to silently downgrade. Read the live config.
      getSetting("privacy_config", {}).then((cfg) => {
        if ((cfg?.httpsOnly === "strict") && /^http:\/\//i.test(url)) {
          url = "nexus://insecure-blocked?url=" + encodeURIComponent(url);
        }
        const tab = tabs.find((t) => t.id === id) || active;
        const newHistory = tab.history.slice(0, tab.hIndex + 1);
        newHistory.push(url);
        patchTab(id, { url, history: newHistory, hIndex: newHistory.length - 1, loading: true, title: url });
        logHistory(url, undefined, tab?.incognito);
        clearTimeout(timers.current[id]);
        timers.current[id] = setTimeout(() => {
          patchTab(id, { loading: false, title: titleFrom(url) });
        }, 900);
      });
    },
    [activeId, tabs, active, patchTab, logHistory, settings]
  );

  const goBack = useCallback(() => {
    if (active.hIndex > 0) {
      const i = active.hIndex - 1;
      patchTab(active.id, { hIndex: i, url: active.history[i], loading: true, title: titleFrom(active.history[i]) });
      clearTimeout(timers.current[active.id]);
      timers.current[active.id] = setTimeout(() => patchTab(active.id, { loading: false }), 500);
    }
  }, [active, patchTab]);

  const goForward = useCallback(() => {
    if (active.hIndex < active.history.length - 1) {
      const i = active.hIndex + 1;
      patchTab(active.id, { hIndex: i, url: active.history[i], loading: true, title: titleFrom(active.history[i]) });
      clearTimeout(timers.current[active.id]);
      timers.current[active.id] = setTimeout(() => patchTab(active.id, { loading: false }), 500);
    }
  }, [active, patchTab]);

  const reload = useCallback(() => {
    patchTab(active.id, { loading: true });
    clearTimeout(timers.current[active.id]);
    timers.current[active.id] = setTimeout(() => patchTab(active.id, { loading: false }), 700);
  }, [active, patchTab]);

  const goHome = useCallback(() => navigate("nexus://start"), [navigate]);

  const newTab = useCallback((opts = {}) => {
    const t = {
      id: nextId++,
      url: "nexus://start",
      title: opts.incognito ? "Incognito Tab" : "New Tab",
      history: ["nexus://start"],
      hIndex: 0,
      loading: false,
      incognito: !!opts.incognito,
    };
    setTabs((prev) => [...prev, t]);
    setActiveId(t.id);
    return t.id;
  }, []);

  const closeTab = useCallback(
    (id) => {
      setTabs((prev) => {
        if (prev.length === 1) return prev;
        const closing = prev.find((t) => t.id === id);
        if (closing) setRecentlyClosed((rc) => [{ ...closing }, ...rc].slice(0, 12));
        const next = prev.filter((t) => t.id !== id);
        if (id === activeId) setActiveId(next[next.length - 1].id);
        return next;
      });
    },
    [activeId]
  );

  // Close several tabs in one state update; keeps `keepId` (or the first survivor) active.
  const closeMany = useCallback((ids, keepId) => {
    const drop = new Set(ids);
    if (drop.size === 0) return;
    setTabs((prev) => {
      const closing = prev.filter((t) => drop.has(t.id));
      let next = prev.filter((t) => !drop.has(t.id));
      if (next.length === 0) next = [prev[0]];
      setRecentlyClosed((rc) => [...closing.reverse(), ...rc].slice(0, 12));
      const stillActive = next.some((t) => t.id === activeId);
      if (!stillActive) setActiveId(next.find((t) => t.id === keepId)?.id ?? next[next.length - 1].id);
      return next;
    });
  }, [activeId]);

  const togglePin = useCallback((id) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)));
  }, []);

  const duplicateTab = useCallback(
    (id) => {
      const src = tabs.find((t) => t.id === id);
      if (!src) return;
      const copy = { ...src, id: nextId++, pinned: false, history: [...src.history], hIndex: src.hIndex, incognito: !!src.incognito };
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === id);
        const out = [...prev];
        out.splice(idx + 1, 0, copy);
        return out;
      });
      setActiveId(copy.id);
    },
    [tabs]
  );

  const restoreTab = useCallback((t) => {
    const restored = { ...t, id: nextId++ };
    setTabs((prev) => [...prev, restored]);
    setRecentlyClosed((rc) => rc.filter((x) => x.id !== t.id));
    setActiveId(restored.id);
  }, []);

  // Open several tabs at once (session restore). `replace` swaps out the current tab set.
  const openTabs = useCallback((list, { replace = false } = {}) => {
    const valid = (list || []).filter((t) => t && typeof t.url === "string" && t.url);
    if (valid.length === 0) return;
    const created = valid.map((t) => ({
      id: nextId++,
      url: t.url,
      title: t.title || titleFrom(t.url),
      history: [t.url],
      hIndex: 0,
      loading: false,
      pinned: !!t.pinned,
      incognito: !!t.incognito,
    }));
    setTabs((prev) => (replace ? created : [...prev, ...created]));
    setActiveId(created[0].id);
  }, []);

  return { tabs, active, activeId, setActiveId, navigate, goBack, goForward, reload, goHome, newTab, closeTab, togglePin, duplicateTab, restoreTab, openTabs, closeMany, recentlyClosed };
}

const INTERNAL_TITLES = {
  "nexus://start": "New Tab",
  "nexus://home": "Home",
  "nexus://search": "Search",
  "nexus://settings": "Settings",
  "nexus://history": "History",
  "nexus://bookmarks": "Bookmarks",
  "nexus://readinglist": "Reading List",
  "nexus://downloads": "Downloads",
  "nexus://notes": "Notes",
  "nexus://workspaces": "Workspaces",
  "nexus://tabs": "Tab Manager",
  "nexus://sessions": "Session Vault",
  "nexus://privacy": "Privacy",
  "nexus://security": "Security",
  "nexus://performance": "Performance",
  "nexus://diagnostics": "Diagnostics",
  "nexus://extensions": "Extensions",
  "nexus://toolbox": "Toolbox",
  "nexus://labs": "Nexus Labs",
  "nexus://keyboard": "Keyboard Shortcuts",
  "nexus://updates": "Updates",
  "nexus://download": "Download Nexus",
  "nexus://recovery": "Recovery",
  "nexus://premium": "Nexus Premium",
  "nexus://vpn": "NexusVPN",
  "nexus://assistant": "Assistant",
  "nexus://ai-models": "AI Models",
  "nexus://shield": "Site Protection",
  "nexus://fingerprint": "Fingerprint Protection",
  "nexus://permissions": "Permissions",
  "nexus://transparency": "Transparency",
  "nexus://audit": "Privacy Audit",
  "nexus://incognito": "Private Browsing",
  "nexus://research": "Research",
  "nexus://default-browser": "Set as Default",
};

function titleFrom(url) {
  if (url.startsWith("nexus://")) {
    const base = url.split("?")[0].replace(/\/+$/, "");
    return INTERNAL_TITLES[base] || "Nexus";
  }
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Delegate to the Electron-backed hook when running in the native shell.
// The runtime is constant for the app's lifetime, so this is evaluated once
// at module load time — no conditional hook calls at render time.
export default isDesktopRuntime() ? useDesktopBrowser : useWebBrowser;