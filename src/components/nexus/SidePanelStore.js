import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSetting, setSetting } from "./services";

/**
 * SidePanelStore — persistent state for the Nexus Web App Dock.
 *
 * The dock holds ONLY websites (Discord, YouTube, GitHub, custom URLs).
 * No Nexus tools live here. State is persisted per-user via NexusSettings.
 *
 * Data model per website:
 *   { id, name, url, favicon, pinned, hidden, position, group, customIcon }
 *
 * Dock-level settings:
 *   width: "narrow" | "normal" | "wide"
 *   position: "left" | "right"
 *   grouping: boolean
 *   startupMode: "empty" | "restore" | "pinned"
 *   lastOpenId: string | null
 */

export const WIDTH_MAP = { narrow: 300, normal: 360, wide: 440 };
export const DEFAULT_DOCK = {
  websites: [],
  width: "normal",
  position: "right",
  grouping: false,
  startupMode: "restore",
  lastOpenId: null,
};

/** Built-in preset library (§10). User picks which to add — never auto-filled. */
export const PRESETS = [
  { id: "discord",    name: "Discord",        url: "https://discord.com/app",            cat: "Social" },
  { id: "x",          name: "X",              url: "https://x.com",                      cat: "Social" },
  { id: "instagram",  name: "Instagram",      url: "https://instagram.com",              cat: "Social" },
  { id: "tiktok",     name: "TikTok",         url: "https://tiktok.com",                 cat: "Social" },
  { id: "reddit",     name: "Reddit",         url: "https://reddit.com",                 cat: "Social" },
  { id: "facebook",   name: "Facebook",       url: "https://facebook.com",               cat: "Social" },
  { id: "whatsapp",   name: "WhatsApp",       url: "https://web.whatsapp.com",           cat: "Messaging" },
  { id: "telegram",   name: "Telegram",       url: "https://web.telegram.org",           cat: "Messaging" },
  { id: "messenger",  name: "Messenger",      url: "https://messenger.com",              cat: "Messaging" },
  { id: "slack",      name: "Slack",          url: "https://app.slack.com",              cat: "Messaging" },
  { id: "youtube",    name: "YouTube",        url: "https://youtube.com",                cat: "Media" },
  { id: "ytmusic",    name: "YouTube Music",  url: "https://music.youtube.com",          cat: "Media" },
  { id: "spotify",    name: "Spotify",        url: "https://open.spotify.com",           cat: "Media" },
  { id: "twitch",     name: "Twitch",         url: "https://twitch.tv",                  cat: "Media" },
  { id: "github",     name: "GitHub",         url: "https://github.com",                 cat: "Development" },
  { id: "gitlab",     name: "GitLab",         url: "https://gitlab.com",                 cat: "Development" },
  { id: "stackoverflow", name: "Stack Overflow", url: "https://stackoverflow.com",       cat: "Development" },
  { id: "chatgpt",    name: "ChatGPT",        url: "https://chatgpt.com",                cat: "Development" },
  { id: "gemini",     name: "Gemini",         url: "https://gemini.google.com",          cat: "Development" },
  { id: "gmail",      name: "Gmail",          url: "https://mail.google.com",            cat: "Productivity" },
  { id: "gcal",       name: "Google Calendar", url: "https://calendar.google.com",       cat: "Productivity" },
  { id: "gdrive",     name: "Google Drive",   url: "https://drive.google.com",           cat: "Productivity" },
  { id: "notion",     name: "Notion",         url: "https://notion.so",                  cat: "Productivity" },
];

const KEY = "nexus_web_dock";

export function useSidePanelDock() {
  const [dock, setDock] = useState(DEFAULT_DOCK);
  const [loaded, setLoaded] = useState(false);
  const persistTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const stored = await getSetting(KEY, null);
        if (alive && stored && typeof stored === "object") {
          setDock({ ...DEFAULT_DOCK, ...stored, websites: Array.isArray(stored.websites) ? stored.websites : [] });
        }
      } catch { /* defaults */ } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  const persist = useCallback((next) => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => setSetting(KEY, next).catch(() => {}), 200);
  }, []);

  const update = useCallback((patch) => {
    setDock((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, [persist]);

  /* ---------- Website CRUD ---------- */

  const addWebsite = useCallback((site) => {
    setDock((prev) => {
      const id = site.id || ("web_" + Date.now());
      const entry = {
        id,
        name: site.name || new URL(site.url).hostname.replace(/^www\./, ""),
        url: site.url,
        favicon: site.favicon || `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(site.url)}`,
        pinned: site.pinned ?? true,
        hidden: false,
        position: prev.websites.length,
        group: site.group || "",
        customIcon: site.customIcon || null,
      };
      const next = { ...prev, websites: [...prev.websites, entry] };
      persist(next);
      return next;
    });
  }, [persist]);

  const removeWebsite = useCallback((id) => {
    setDock((prev) => {
      const next = { ...prev, websites: prev.websites.filter((w) => w.id !== id) };
      persist(next);
      return next;
    });
  }, [persist]);

  const updateWebsite = useCallback((id, patch) => {
    setDock((prev) => {
      const next = {
        ...prev,
        websites: prev.websites.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      };
      persist(next);
      return next;
    });
  }, [persist]);

  const reorder = useCallback((orderedIds) => {
    setDock((prev) => {
      const byId = Object.fromEntries(prev.websites.map((w) => [w.id, w]));
      const websites = orderedIds.map((id, i) => ({ ...byId[id], position: i })).filter(Boolean);
      // append any missing (safety)
      prev.websites.forEach((w) => { if (!orderedIds.includes(w.id)) websites.push(w); });
      const next = { ...prev, websites };
      persist(next);
      return next;
    });
  }, [persist]);

  const setLastOpen = useCallback((id) => {
    setDock((prev) => {
      const next = { ...prev, lastOpenId: id };
      persist(next);
      return next;
    });
  }, [persist]);

  const reset = useCallback(() => {
    setDock(DEFAULT_DOCK);
    persist(DEFAULT_DOCK);
  }, [persist]);

  /* ---------- Derived ---------- */

  const websites = useMemo(() => dock.websites.slice().sort((a, b) => a.position - b.position), [dock.websites]);
  const visible = useMemo(() => websites.filter((w) => !w.hidden), [websites]);
  const pinned = useMemo(() => visible.filter((w) => w.pinned), [visible]);
  const unpinned = useMemo(() => visible.filter((w) => !w.pinned), [visible]);

  return {
    dock, loaded, update, reset,
    websites, visible, pinned, unpinned,
    addWebsite, removeWebsite, updateWebsite, reorder, setLastOpen,
  };
}

/** Normalize a user-entered URL into a proper https:// URL (§8). */
export function normalizeUrl(input) {
  let u = String(input || "").trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    const parsed = new URL(u);
    if (!parsed.hostname.includes(".")) return null; // not a real domain
    return parsed.href;
  } catch {
    return null;
  }
}

/** Derive a display name from a URL (§8 — no invented data). */
export function nameFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    // Capitalize first segment: "open.spotify.com" → "Spotify", "discord.com" → "Discord"
    const parts = host.split(".");
    const main = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    return main.charAt(0).toUpperCase() + main.slice(1);
  } catch {
    return "Website";
  }
}