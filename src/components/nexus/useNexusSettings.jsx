import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getSetting, setSetting } from "./services";

/**
 * Central Nexus settings store.
 *
 * - Single source of truth for every browser preference.
 * - Persisted per-user via the NexusSettings entity (getSetting/setSetting).
 * - Restored on mount, applied live to the DOM via CSS variables + data attributes.
 * - Exposes `update(key, value)` which persists AND applies.
 * - Exposes `resetAppearance`, `resetAll`, `exportConfig`, `importConfig`.
 */

export const DEFAULT_SETTINGS = {
  // General
  startup: "newtab", // newtab | continue | pages
  newTabBehavior: "startpage", // startpage | blank | homepage
  homepage: "nexus://start",
  restoreSession: true,
  continueWhereLeftOff: true,
  browserLanguage: "en",
  region: "auto",

  // Search
  searchEngine: "nexus", // nexus | google | bing | duckduckgo | brave | custom
  customSearchUrl: "",
  searchSuggestions: true,
  searchHistory: true,
  instantResults: false,
  safeSearch: "moderate", // off | moderate | strict
  openResultsIn: "current", // current | new | background
  searchAutocomplete: true,
  aiSearch: true,
  personalizedResults: false,
  searchDensity: "comfortable", // comfortable | compact
  searchAnimations: true,

  // Appearance
  theme: "midnight", // managed by useTheme but mirrored here for search/export
  accent: "217 91% 60%", // HSL channels
  density: "comfortable", // comfortable | compact
  uiScale: 100, // 90 | 100 | 110
  animations: true,
  microInteractions: true,
  transparency: true,
  reducedMotion: false,

  // VFX quality
  vfxQuality: "balanced", // performance | balanced | high | ultra

  // Tabs
  tabPosition: "top", // top | left | right
  tabPreviews: true,
  tabAnimations: true,
  tabGroups: true,
  sleepingTabs: true,
  duplicatePinned: false,
  confirmCloseMultiple: false,

  // Navigation
  linkOpening: "current", // current | new
  keyboardNavigation: true,

  // Reading & display
  pageZoom: 100, // 50–200, applied to WebView iframe
  readerFontSize: 100, // future reader mode

  // Privacy & Security
  trackingProtection: "standard", // off | standard | strict
  adBlocking: true,
  thirdPartyCookies: false,
  clearOnExit: false,

  // Downloads
  askWhereToSave: true,
  downloadNotifications: true,

  // Sidebar
  sidebarEnabled: true,
  sidebarPosition: "left", // left | right
  sidebarAutoCollapse: false,

  // Assistant
  assistantEnabled: true,
  assistantContext: true,
  assistantMemory: false,

  // Audio & Sounds
  uiSounds: false,
  navigationSounds: false,
  tabSounds: false,
  notificationSounds: true,
  assistantSounds: false,
  masterVolume: 70,
  musicVolume: 50,
  ambientAudio: false,
  ambientTrack: "deepspace",
  ambientVolume: 50,
  soundPack: "nexus",
  reducedSound: false,
  ambientAutoplay: false,
  ambientFade: true,

  // Performance mode (drives VFX + behavior)
  performanceMode: "balanced", // performance | balanced | high | ultra

  // Hardware
  hardwareAcceleration: true,
  batterySaver: false,

  // Updates — automatic background update checks
  autoUpdateChecks: true,          // check for new releases without prompting
  updateCheckIntervalHours: 4,     // hours between automatic re-checks
  updateChannel: "stable",          // stable | beta | nightly

  // Force Dark for Websites (separate from UI theme)
  websiteDarkMode: "off", // off | on | auto
  darkApplyScope: "all", // all | selected | excluded
  darkSelectedSites: [],
  darkExcludedSites: [],
  darkSmartImages: true,
  darkSmartMedia: true,
  darkReduceBright: false,
  darkContrast: 100,
  darkBrightness: 100,
  darkSaturation: 100,

  // Side Panel
  sidePanelEnabled: true,
  sidePanelPosition: "right", // left | right
  sidePanelWidth: "standard", // compact | standard | wide
  sidePanelCustomWidth: 360,
  sidePanelApps: [
    "assistant", "bookmarks", "history", "downloads", "notes",
    "readinglist", "workspaces", "tabs", "search", "privacy", "performance", "music",
  ],
  sidePanelPinned: ["assistant"],
  sidePanelHidden: [],

  // Themes (mirrored for export)
  customTheme: null,

  // Keyboard shortcuts (display-only registry; customization is native runtime)
  keyboardShortcuts: true,

  // Workspaces
  activeWorkspace: null,

  // Bookmarks bar
  bookmarkBar: true,

  // Toast/notification preference
  notifications: true,
};

const APPEARANCE_KEYS = [
  "theme", "accent", "density", "uiScale", "animations", "microInteractions",
  "transparency", "reducedMotion", "vfxQuality",
];

const SettingsContext = createContext(null);

export function NexusSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const pending = useRef({});
  const persistTimer = useRef(null);

  // Load persisted settings once.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const stored = await getSetting("nexus_settings", null);
        if (alive && stored && typeof stored === "object") {
          setSettings((prev) => ({ ...prev, ...stored }));
        }
      } catch {
        /* fall back to defaults */
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Apply visual settings to the DOM whenever they change.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", settings.accent);
    root.dataset.density = settings.density;
    root.dataset.vfx = settings.reducedMotion ? "performance" : settings.vfxQuality;
    root.dataset.uiScale = String(settings.uiScale);
    root.style.fontSize = `${(settings.uiScale / 100) * 16}px`;
    root.dataset.animations = settings.animations && !settings.reducedMotion ? "on" : "off";
    root.dataset.transparency = settings.transparency ? "on" : "off";
  }, [settings.accent, settings.density, settings.vfxQuality, settings.uiScale, settings.animations, settings.reducedMotion, settings.transparency]);

  // Persist the whole settings object (debounced).
  const persist = useCallback((next) => {
    pending.current = next;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      setSetting("nexus_settings", pending.current).catch(() => {});
    }, 250);
  }, []);

  const update = useCallback((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      persist(next);
      return next;
    });
  }, [persist]);

  const updateMany = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, [persist]);

  const resetAppearance = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev };
      APPEARANCE_KEYS.forEach((k) => { next[k] = DEFAULT_SETTINGS[k]; });
      persist(next);
      return next;
    });
  }, [persist]);

  const resetAll = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    persist(DEFAULT_SETTINGS);
  }, [persist]);

  const exportConfig = useCallback(() => JSON.stringify(settings, null, 2), [settings]);

  const importConfig = useCallback((jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== "object") throw new Error("Invalid config");
      const safe = {};
      Object.keys(DEFAULT_SETTINGS).forEach((k) => {
        if (parsed[k] !== undefined && parsed[k] !== null) safe[k] = parsed[k];
      });
      setSettings((prev) => {
        const next = { ...prev, ...safe };
        persist(next);
        return next;
      });
      return true;
    } catch {
      return false;
    }
  }, [persist]);

  const value = useMemo(() => ({
    settings, loaded, update, updateMany, resetAppearance, resetAll, exportConfig, importConfig,
  }), [settings, loaded, update, updateMany, resetAppearance, resetAll, exportConfig, importConfig]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useNexusSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useNexusSettings must be used within NexusSettingsProvider");
  return ctx;
}