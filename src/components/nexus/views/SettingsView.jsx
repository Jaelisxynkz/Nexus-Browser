import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search, Settings2, Palette, Monitor, Sparkles, PanelsTopLeft, Navigation, Shield, Download,
  Star, Clock, Puzzle, PanelLeft, Bot, Volume2, Gauge, Sun, Moon, RotateCcw, Trash2, Download as DownloadIcon,
  Upload, ChevronRight, SlidersHorizontal, Eye, Fingerprint, Lock, Globe,
} from "lucide-react";
import { useNexusSettings, DEFAULT_SETTINGS } from "../useNexusSettings";
import { useTheme } from "../Theme";
import { SEARCH_ENGINES } from "../searchEngine";
import { useToast } from "@/components/ui/use-toast";
import SettingRow, { Segmented, Toggle, SectionTitle } from "../settings/SettingRow";

/**
 * Settings — a professional, hierarchical browser configuration menu.
 *
 * Structure mirrors standard browser settings: top-level categories grouped
 * into sections (Appearance, Privacy & Security, Search, etc.), each with
 * expandable sub-sections. Search filters across all categories and surfaces
 * matching settings inline.
 *
 * No "Quick Actions" — export/import/reset live under their relevant sections
 * (General → Reset; Appearance → Theme) and the main sidebar footer.
 */

// ---- Top-level category groups (hierarchical) ----
const GROUPS = [
  {
    label: null, // ungrouped top
    categories: [
      { id: "general", label: "General", icon: Settings2, desc: "Startup, tabs, homepage" },
      { id: "appearance", label: "Appearance", icon: Palette, desc: "Theme, accent, layout" },
    ],
  },
  {
    label: "Privacy & Security",
    categories: [
      { id: "privacy", label: "Privacy & Security", icon: Shield, desc: "Tracking, cookies, permissions" },
      { id: "search", label: "Search", icon: Search, desc: "Engine, suggestions, results" },
    ],
  },
  {
    label: "Browser",
    categories: [
      { id: "tabs", label: "Tabs", icon: PanelsTopLeft, desc: "Position, previews, sleeping" },
      { id: "navigation", label: "Navigation", icon: Navigation, desc: "Links, keyboard, URL handling" },
      { id: "sidebar", label: "Sidebar", icon: PanelLeft, desc: "Enable, position, collapse" },
      { id: "downloads", label: "Downloads", icon: Download, desc: "Save location, notifications" },
      { id: "bookmarks", label: "Bookmarks", icon: Star, desc: "Bookmark bar, organization" },
      { id: "history", label: "History", icon: Clock, desc: "Search history, retention" },
    ],
  },
  {
    label: "Extensions & AI",
    categories: [
      { id: "extensions", label: "Extensions", icon: Puzzle, desc: "Runtime, permissions" },
      { id: "assistant", label: "Nexus Assistant", icon: Bot, desc: "AI, page awareness, memory" },
    ],
  },
  {
    label: "System",
    categories: [
      { id: "performance", label: "Performance", icon: Gauge, desc: "Hardware accel, battery, VFX" },
      { id: "vfx", label: "Visual Effects", icon: Sparkles, desc: "Quality, glass, motion" },
      { id: "audio", label: "Audio", icon: Volume2, desc: "Sounds, volume, ambient" },
    ],
  },
];

const ALL_CATEGORIES = GROUPS.flatMap((g) => g.categories);
const CATEGORY_MAP = Object.fromEntries(ALL_CATEGORIES.map((c) => [c.id, c]));

const ENGINE_OPTIONS = Object.values(SEARCH_ENGINES).map((e) => ({ value: e.id, label: e.label }));

export default function SettingsView() {
  const { settings, update, updateMany, resetAppearance, resetAll, exportConfig, importConfig } = useNexusSettings();
  const { theme, setTheme, themes } = useTheme();
  const { toast } = useToast();

  const [activeCategory, setActiveCategory] = useState("general");
  const [query, setQuery] = useState("");
  const [confirmReset, setConfirmReset] = useState(null); // "appearance" | "all"
  const fileRef = useRef(null);

  // Settings search index
  const searchIndex = useMemo(() => buildSearchIndex(), []);

  // Filter: when searching, show matching settings inline (cross-category).
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return searchIndex.filter(
      (e) => e.terms.some((t) => t.includes(q)) || e.label.toLowerCase().includes(q)
    );
  }, [query, searchIndex]);

  // Which categories have matches (for sidebar badges)
  const categoryMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return {};
    const counts = {};
    searchIndex.forEach((e) => {
      if (e.terms.some((t) => t.includes(q)) || e.label.toLowerCase().includes(q)) {
        counts[e.category] = (counts[e.category] || 0) + 1;
      }
    });
    return counts;
  }, [query, searchIndex]);

  const notify = (label) => toast({ title: label + " changed" });

  const onSearchEngine = (id) => { update("searchEngine", id); notify("Search engine"); };
  const onTheme = (key) => { setTheme(key); update("theme", key); notify("Theme"); };

  const accentOptions = [
    { value: "217 91% 60%", label: "Nexus Blue", color: "#3b82f6" },
    { value: "280 90% 65%", label: "Violet", color: "#a855f7" },
    { value: "160 100% 45%", label: "Emerald", color: "#10b981" },
    { value: "14 100% 60%", label: "Amber", color: "#f97316" },
    { value: "330 90% 60%", label: "Rose", color: "#ec4899" },
  ];

  const handleExport = () => {
    const blob = new Blob([exportConfig()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "nexus-settings.json"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Settings exported" });
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importConfig(String(reader.result));
      if (ok) toast({ title: "Settings imported" });
      else toast({ title: "Import failed", description: "The file is not valid Nexus settings." });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const doReset = () => {
    if (confirmReset === "appearance") resetAppearance();
    else resetAll();
    setConfirmReset(null);
    toast({ title: confirmReset === "appearance" ? "Appearance reset" : "All settings reset" });
  };

  // ---- Render per category ----
  const renderGeneral = () => (
    <>
      <SectionTitle>Startup</SectionTitle>
      <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5">
        <SettingRow label="On startup" desc="What Nexus opens when it launches.">
          <Segmented value={settings.startup} onChange={(v) => { update("startup", v); notify("Startup"); }}
            options={[
              { value: "newtab", label: "New Tab" },
              { value: "continue", label: "Resume" },
              { value: "pages", label: "Pages" },
            ]} />
        </SettingRow>
        <SettingRow label="New tab behavior" desc="What a new tab shows by default.">
          <Segmented value={settings.newTabBehavior} onChange={(v) => { update("newTabBehavior", v); notify("New tab"); }}
            options={[
              { value: "startpage", label: "Start Page" },
              { value: "blank", label: "Blank" },
              { value: "homepage", label: "Homepage" },
            ]} />
        </SettingRow>
        <SettingRow label="Homepage" desc="The page Nexus opens as your home.">
          <Segmented value={settings.homepage} onChange={(v) => { update("homepage", v); notify("Homepage"); }}
            options={[
              { value: "nexus://start", label: "Start Page" },
              { value: "nexus://home", label: "Nexus Home" },
              { value: "blank", label: "Blank" },
            ]} />
        </SettingRow>
        <SettingRow label="Restore previous session" desc="Reopen your tabs from the last session on launch.">
          <Toggle checked={settings.restoreSession} onChange={(v) => update("restoreSession", v)} />
        </SettingRow>
        <SettingRow label="Continue where you left off" desc="Pick up exactly where you stopped browsing.">
          <Toggle checked={settings.continueWhereLeftOff} onChange={(v) => update("continueWhereLeftOff", v)} />
        </SettingRow>
      </div>
      <SectionTitle>Language & Region</SectionTitle>
      <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5">
        <SettingRow label="Browser language" desc="Language used for the browser interface (when available).">
          <Segmented value={settings.browserLanguage} onChange={(v) => update("browserLanguage", v)}
            options={[{ value: "en", label: "English" }, { value: "auto", label: "Auto" }]} />
        </SettingRow>
        <SettingRow label="Region" desc="Regional search and content preferences.">
          <Segmented value={settings.region} onChange={(v) => update("region", v)}
            options={[{ value: "auto", label: "Auto" }, { value: "us", label: "US" }, { value: "global", label: "Global" }]} />
        </SettingRow>
      </div>
      <SectionTitle>Configuration</SectionTitle>
      <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5">
        <SettingRow label="Export settings" desc="Download your Nexus configuration as a JSON file.">
          <button onClick={handleExport} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] text-white hover:bg-white/[0.08]">
            Export
          </button>
        </SettingRow>
        <SettingRow label="Import settings" desc="Restore configuration from a previously exported file.">
          <button onClick={() => fileRef.current?.click()} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] text-white hover:bg-white/[0.08]">
            Choose file…
          </button>
        </SettingRow>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
        <SettingRow label="Reset appearance" desc="Restore theme, accent, density, and visual effects to defaults.">
          <button onClick={() => setConfirmReset("appearance")} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[12px] text-amber-200 hover:bg-amber-500/20">
            Reset appearance
          </button>
        </SettingRow>
        <SettingRow label="Reset all settings" desc="Reset every Nexus preference to its default. Browser data is not deleted.">
          <button onClick={() => setConfirmReset("all")} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[12px] text-red-300 hover:bg-red-500/20">
            Reset all
          </button>
        </SettingRow>
      </div>
    </>
  );

  const renderAppearance = () => (
    <>
      <SectionTitle>Theme</SectionTitle>
      <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
        <div className="mb-3 text-[13.5px] font-medium text-white">Theme presets</div>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(themes).map(([key, t]) => (
            <button key={key} onClick={() => onTheme(key)}
              className={`group rounded-xl border p-3 text-left transition ${
                theme === key ? "border-[#3b82f6] bg-[#3b82f6]/10" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"
              }`}>
              <div className="flex h-8 gap-1">
                {["--background", "--card", "--primary", "--accent", "--muted"].map((v) => (
                  <span key={v} className="h-full flex-1 rounded" style={{ background: `hsl(${t.vars[v]})` }} />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-white">
                {t.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      <SectionTitle>Accent</SectionTitle>
      <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
        <div className="grid grid-cols-5 gap-3">
          {accentOptions.map((a) => (
            <button key={a.label} onClick={() => { update("accent", a.value); notify("Accent color"); }}
              className={`flex flex-col items-center gap-2 rounded-lg p-2 transition ${
                settings.accent === a.value ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
              }`}>
              <span className="grid h-8 w-8 place-items-center rounded-full" style={{ background: a.color, boxShadow: `0 0 14px ${a.color}66` }}>
                {settings.accent === a.value && <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </span>
              <span className="text-[10px] text-white/60">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <SectionTitle>Layout</SectionTitle>
      <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5">
        <SettingRow label="Density" desc="Compact a tighter UI, comfortable a relaxed one.">
          <Segmented value={settings.density} onChange={(v) => { update("density", v); notify("Density"); }}
            options={[{ value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" }]} />
        </SettingRow>
        <SettingRow label="UI scale" desc="Zoom the whole interface.">
          <Segmented value={String(settings.uiScale)} onChange={(v) => { update("uiScale", Number(v)); notify("UI scale"); }}
            options={[{ value: "90", label: "90%" }, { value: "100", label: "100%" }, { value: "110", label: "110%" }]} />
        </SettingRow>
        <SettingRow label="Animations" desc="Enable interface motion and transitions.">
          <Toggle checked={settings.animations} onChange={(v) => update("animations", v)} />
        </SettingRow>
        <SettingRow label="Micro-interactions" desc="Subtle hover and press feedback on controls.">
          <Toggle checked={settings.microInteractions} onChange={(v) => update("microInteractions", v)} />
        </SettingRow>
        <SettingRow label="Transparency" desc="Translucent surfaces and glass effects.">
          <Toggle checked={settings.transparency} onChange={(v) => update("transparency", v)} />
        </SettingRow>
        <SettingRow label="Reduced motion" desc="Minimize motion to respect your preference.">
          <Toggle checked={settings.reducedMotion} onChange={(v) => update("reducedMotion", v)} />
        </SettingRow>
      </div>
    </>
  );

  const renderSearch = () => (
    <>
      <SectionTitle>Default Search Engine</SectionTitle>
      <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5">
        <SettingRow label="Search engine" desc="The default provider for every search. Nexus Search is recommended.">
          <select value={settings.searchEngine} onChange={(e) => onSearchEngine(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-[#0a0f1e] px-3 py-2 text-[13px] text-white outline-none focus:border-[#3b82f6]">
            {ENGINE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </SettingRow>
        {settings.searchEngine === "custom" && (
          <SettingRow label="Custom search URL" desc="Use {searchTerms} as the query placeholder.">
            <input value={settings.customSearchUrl} onChange={(e) => update("customSearchUrl", e.target.value)}
              placeholder="https://…/search?q={searchTerms}"
              className="w-56 rounded-lg border border-white/[0.08] bg-[#0a0f1e] px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/30 focus:border-[#3b82f6]" />
          </SettingRow>
        )}
      </div>

      <SectionTitle>Nexus Search</SectionTitle>
      <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5">
        <SettingRow label="Search suggestions" desc="Show suggestions as you type.">
          <Toggle checked={settings.searchSuggestions} onChange={(v) => update("searchSuggestions", v)} />
        </SettingRow>
        <SettingRow label="Search history" desc="Remember and reuse past searches.">
          <Toggle checked={settings.searchHistory} onChange={(v) => update("searchHistory", v)} />
        </SettingRow>
        <SettingRow label="AI-enhanced search" desc="Use AI to enrich search results where available.">
          <Toggle checked={settings.aiSearch} onChange={(v) => update("aiSearch", v)} />
        </SettingRow>
        <SettingRow label="Personalized results" desc="Tailor results to your browsing (optional).">
          <Toggle checked={settings.personalizedResults} onChange={(v) => update("personalizedResults", v)} />
        </SettingRow>
        <SettingRow label="Safe search" desc="Filter potentially explicit content.">
          <Segmented value={settings.safeSearch} onChange={(v) => { update("safeSearch", v); notify("Safe search"); }}
            options={[{ value: "off", label: "Off" }, { value: "moderate", label: "Moderate" }, { value: "strict", label: "Strict" }]} />
        </SettingRow>
      </div>

      <SectionTitle>Results</SectionTitle>
      <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5">
        <SettingRow label="Open results in" desc="Where search result links open.">
          <Segmented value={settings.openResultsIn} onChange={(v) => { update("openResultsIn", v); notify("Result behavior"); }}
            options={[{ value: "current", label: "Current tab" }, { value: "new", label: "New tab" }, { value: "background", label: "Background" }]} />
        </SettingRow>
        <SettingRow label="Result density" desc="How crowded search results appear.">
          <Segmented value={settings.searchDensity} onChange={(v) => update("searchDensity", v)}
            options={[{ value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" }]} />
        </SettingRow>
        <SettingRow label="Search animations" desc="Animate results and transitions.">
          <Toggle checked={settings.searchAnimations} onChange={(v) => update("searchAnimations", v)} />
        </SettingRow>
      </div>
    </>
  );

  const renderTabs = () => (
    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5">
      <SettingRow label="New tab page" desc="What opens when you create a tab.">
        <Segmented value={settings.newTabBehavior} onChange={(v) => update("newTabBehavior", v)}
          options={[{ value: "startpage", label: "Start" }, { value: "blank", label: "Blank" }]} />
      </SettingRow>
      <SettingRow label="Tab position" desc="Where the tab strip sits.">
        <Segmented value={settings.tabPosition} onChange={(v) => update("tabPosition", v)}
          options={[{ value: "top", label: "Top" }, { value: "left", label: "Left" }, { value: "right", label: "Right" }]} />
      </SettingRow>
      <SettingRow label="Tab previews" desc="Show page previews on hover.">
        <Toggle checked={settings.tabPreviews} onChange={(v) => update("tabPreviews", v)} />
      </SettingRow>
      <SettingRow label="Tab animations" desc="Animate tab switches and closes.">
        <Toggle checked={settings.tabAnimations} onChange={(v) => update("tabAnimations", v)} />
      </SettingRow>
      <SettingRow label="Sleeping tabs" desc="Suspend inactive tabs to save memory.">
        <Toggle checked={settings.sleepingTabs} onChange={(v) => update("sleepingTabs", v)} />
      </SettingRow>
      <SettingRow label="Duplicate keeps pin" desc="Preserve pinned state when duplicating.">
        <Toggle checked={settings.duplicatePinned} onChange={(v) => update("duplicatePinned", v)} />
      </SettingRow>
      <SettingRow label="Confirm multi-close" desc="Ask before closing several tabs at once.">
        <Toggle checked={settings.confirmCloseMultiple} onChange={(v) => update("confirmCloseMultiple", v)} />
      </SettingRow>
    </div>
  );

  const renderNavigation = () => (
    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5">
      <SettingRow label="Open links in" desc="Default target for navigations.">
        <Segmented value={settings.linkOpening} onChange={(v) => update("linkOpening", v)}
          options={[{ value: "current", label: "Current tab" }, { value: "new", label: "New tab" }]} />
      </SettingRow>
      <SettingRow label="Keyboard navigation" desc="Enable arrow-key navigation for menus and results.">
        <Toggle checked={settings.keyboardNavigation} onChange={(v) => update("keyboardNavigation", v)} />
      </SettingRow>
      <SettingRow label="URL handling" desc="Valid addresses open as URLs; anything else searches with Nexus Search.">
        <span className="text-[12px] text-white/40">Smart</span>
      </SettingRow>
    </div>
  );

  const renderPrivacy = () => (
    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5">
      <SettingRow label="Tracking protection" desc="Block trackers at your chosen level.">
        <Segmented value={settings.trackingProtection} onChange={(v) => update("trackingProtection", v)}
          options={[{ value: "off", label: "Off" }, { value: "standard", label: "Standard" }, { value: "strict", label: "Strict" }]} />
      </SettingRow>
      <SettingRow label="Ad blocking" desc="Block intrusive advertisements.">
        <Toggle checked={settings.adBlocking} onChange={(v) => update("adBlocking", v)} />
      </SettingRow>
      <SettingRow label="Block third-party cookies" desc="Prevent cross-site tracking cookies.">
        <Toggle checked={settings.thirdPartyCookies} onChange={(v) => update("thirdPartyCookies", v)} />
      </SettingRow>
      <SettingRow label="Clear on exit" desc="Wipe browsing data when you close Nexus.">
        <Toggle checked={settings.clearOnExit} onChange={(v) => update("clearOnExit", v)} />
      </SettingRow>
      <SettingRow label="Camera / Mic / Location permissions" desc="Site permission prompts are managed per-site by the runtime.">
        <span className="text-[12px] text-white/35">Runtime</span>
      </SettingRow>
    </div>
  );

  const renderDownloads = () => (
    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5">
      <SettingRow label="Ask where to save" desc="Prompt for a location before each download.">
        <Toggle checked={settings.askWhereToSave} onChange={(v) => update("askWhereToSave", v)} />
      </SettingRow>
      <SettingRow label="Download notifications" desc="Show a notification when a download completes.">
        <Toggle checked={settings.downloadNotifications} onChange={(v) => update("downloadNotifications", v)} />
      </SettingRow>
      <SettingRow label="Download location" desc="Manage where files save.">
        <button disabled className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/40 cursor-not-allowed" title="Requires native runtime">
          Native runtime
        </button>
      </SettingRow>
    </div>
  );

  const renderBookmarks = () => (
    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5">
      <SettingRow label="Bookmark bar" desc="Show the bookmarks bar below the address field.">
        <Toggle checked={settings.bookmarkBar} onChange={(v) => update("bookmarkBar", v)} />
      </SettingRow>
      <SettingRow label="Bookmark organization" desc="Folders and tags are supported throughout Nexus.">
        <span className="text-[12px] text-white/45">Folders + tags</span>
      </SettingRow>
      <SettingRow label="Import / Export bookmarks" desc="Manage bookmark backups.">
        <button disabled className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/40 cursor-not-allowed" title="Requires native runtime">
          Native runtime
        </button>
      </SettingRow>
    </div>
  );

  const renderHistory = () => (
    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5">
      <SettingRow label="Search history" desc="Remember searches.">
        <Toggle checked={settings.searchHistory} onChange={(v) => update("searchHistory", v)} />
      </SettingRow>
      <SettingRow label="Auto-delete history" desc="Clear on exit.">
        <Toggle checked={settings.clearOnExit} onChange={(v) => update("clearOnExit", v)} />
      </SettingRow>
      <SettingRow label="Retention" desc="History is kept until you clear it.">
        <span className="text-[12px] text-white/40">Manual</span>
      </SettingRow>
    </div>
  );

  const renderExtensions = () => (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-amber-200">
          <Puzzle className="h-4 w-4" /> Extension runtime
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-amber-200/70">
          Hosting real browser extensions requires a native extension runtime (a Chromium-compatible shell).
          This web build provides the management architecture and permission model but does not simulate installed extensions.
        </p>
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
          <Shield className="h-4 w-4 text-[#60a5fa]" /> Permission model
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-white/50">
          Extension permissions, enable/disable, and removal are designed and ready for the native shell.
        </p>
      </div>
    </div>
  );

  const renderSidebar = () => (
    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5">
      <SettingRow label="Enable sidebar" desc="Show the navigation sidebar.">
        <Toggle checked={settings.sidebarEnabled} onChange={(v) => update("sidebarEnabled", v)} />
      </SettingRow>
      <SettingRow label="Sidebar position" desc="Which side the sidebar appears on.">
        <Segmented value={settings.sidebarPosition} onChange={(v) => update("sidebarPosition", v)}
          options={[{ value: "left", label: "Left" }, { value: "right", label: "Right" }]} />
      </SettingRow>
      <SettingRow label="Auto-collapse" desc="Collapse the sidebar to icons automatically.">
        <Toggle checked={settings.sidebarAutoCollapse} onChange={(v) => update("sidebarAutoCollapse", v)} />
      </SettingRow>
      <SettingRow label="Website panels" desc="Pin web apps as side panels.">
        <span className="text-[12px] text-white/35">Available</span>
      </SettingRow>
    </div>
  );

  const renderAssistant = () => (
    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5">
      <SettingRow label="Enable Assistant" desc="Turn Nexus AI on or off.">
        <Toggle checked={settings.assistantEnabled} onChange={(v) => update("assistantEnabled", v)} />
      </SettingRow>
      <SettingRow label="Page awareness" desc="Let the Assistant read the current page context.">
        <Toggle checked={settings.assistantContext} onChange={(v) => update("assistantContext", v)} />
      </SettingRow>
      <SettingRow label="Conversation memory" desc="Remember context across conversations.">
        <Toggle checked={settings.assistantMemory} onChange={(v) => update("assistantMemory", v)} />
      </SettingRow>
      <SettingRow label="Model" desc="Which AI model powers the Assistant.">
        <select value="auto" disabled className="rounded-lg border border-white/[0.08] bg-[#0a0f1e] px-3 py-2 text-[12px] text-white/40 outline-none">
          <option>Automatic (recommended)</option>
        </select>
      </SettingRow>
      <SettingRow label="Local models" desc="Run models on your own hardware.">
        <button disabled className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/40 cursor-not-allowed" title="Requires native runtime">
          Native runtime
        </button>
      </SettingRow>
    </div>
  );

  const renderAudio = () => (
    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5">
      <SettingRow label="UI sounds" desc="System feedback sounds.">
        <Toggle checked={settings.uiSounds} onChange={(v) => update("uiSounds", v)} />
      </SettingRow>
      <SettingRow label="Master volume" desc="Overall audio output level.">
        <div className="w-40">
          <input type="range" min="0" max="100" value={settings.masterVolume}
            onChange={(e) => update("masterVolume", Number(e.target.value))}
            className="w-full accent-[#3b82f6]" />
        </div>
      </SettingRow>
      <SettingRow label="Ambient audio" desc="Environmental sounds (when supported).">
        <Toggle checked={settings.ambientAudio} onChange={(v) => update("ambientAudio", v)} />
      </SettingRow>
    </div>
  );

  const renderPerformance = () => (
    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5">
      <SettingRow label="Hardware acceleration" desc="Use the GPU where available.">
        <Toggle checked={settings.hardwareAcceleration} onChange={(v) => update("hardwareAcceleration", v)} />
      </SettingRow>
      <SettingRow label="Sleeping tabs" desc="Suspend unused tabs to save memory.">
        <Toggle checked={settings.sleepingTabs} onChange={(v) => update("sleepingTabs", v)} />
      </SettingRow>
      <SettingRow label="Battery saver" desc="Reduce background work on battery power.">
        <Toggle checked={settings.batterySaver} onChange={(v) => update("batterySaver", v)} />
      </SettingRow>
      <SettingRow label="Performance mode" desc="Prefer responsiveness over visual flourish.">
        <span className="text-[12px] text-white/45">Managed automatically</span>
      </SettingRow>
      <SettingRow label="VFX quality" desc="Controls the visual workload (see Visual Effects).">
        <Segmented value={settings.vfxQuality} onChange={(v) => { update("vfxQuality", v); notify("VFX quality"); }}
          options={[
            { value: "performance", label: "Perf" },
            { value: "balanced", label: "Balanced" },
            { value: "high", label: "High" },
            { value: "ultra", label: "Ultra" },
          ]} />
      </SettingRow>
    </div>
  );

  const renderVfx = () => (
    <>
      <SectionTitle>Visual quality</SectionTitle>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[
          { id: "performance", label: "Performance", desc: "Minimal VFX. Best battery and speed.", chip: "Minimal" },
          { id: "balanced", label: "Balanced", desc: "Premium effects with restrained workload.", chip: "Recommended" },
          { id: "high", label: "High Quality", desc: "Richer blur, lighting, and motion.", chip: "Advanced" },
          { id: "ultra", label: "Ultra Visual", desc: "Maximum supported visual quality.", chip: "Intensive" },
        ].map((m) => (
          <button key={m.id} onClick={() => { update("vfxQuality", m.id); notify("VFX quality"); }}
            className={`rounded-xl border p-4 text-left transition ${
              settings.vfxQuality === m.id ? "border-[#3b82f6] bg-[#3b82f6]/10" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"
            }`}>
            <div className="flex items-center justify-between">
              <span className="text-[13.5px] font-semibold text-white">{m.label}</span>
              {settings.vfxQuality === m.id && (
                <span className="rounded-full bg-[#3b82f6]/20 px-2 py-0.5 text-[10px] font-semibold text-[#60a5fa]">{m.chip}</span>
              )}
            </div>
            <p className="mt-1 text-[12px] text-white/50">{m.desc}</p>
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5">
        <SettingRow label="Glass & blur effects" desc="Translucent frosted surfaces.">
          <Toggle checked={settings.transparency} onChange={(v) => update("transparency", v)} />
        </SettingRow>
        <SettingRow label="Reduced motion" desc="Disable transitions and motion.">
          <Toggle checked={settings.reducedMotion} onChange={(v) => update("reducedMotion", v)} />
        </SettingRow>
      </div>
      <p className="mt-3 px-1 text-[11px] leading-relaxed text-white/35">
        VFX quality is automatically lowered on low-power devices and when reduced motion is preferred.
      </p>
    </>
  );

  const renderActive = () => {
    switch (activeCategory) {
      case "general": return renderGeneral();
      case "appearance": return renderAppearance();
      case "search": return renderSearch();
      case "tabs": return renderTabs();
      case "navigation": return renderNavigation();
      case "privacy": return renderPrivacy();
      case "downloads": return renderDownloads();
      case "bookmarks": return renderBookmarks();
      case "history": return renderHistory();
      case "extensions": return renderExtensions();
      case "sidebar": return renderSidebar();
      case "assistant": return renderAssistant();
      case "audio": return renderAudio();
      case "performance": return renderPerformance();
      case "vfx": return renderVfx();
      default: return renderGeneral();
    }
  };

  const catRowStyle = (id) => {
    const active = activeCategory === id;
    return active ? "bg-white/[0.06] text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white";
  };

  return (
    <div className="flex h-full">
      {/* Settings sidebar — hierarchical, grouped */}
      <div className="flex w-64 shrink-0 flex-col border-r border-white/[0.06] bg-[#070a14]">
        <div className="border-b border-white/[0.06] p-4">
          <div className="flex items-center gap-2 text-[13.5px] font-semibold text-white">
            <SlidersHorizontal className="h-4 w-4 text-[#60a5fa]" /> Settings
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search settings… (e.g. dark mode)"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] py-2 pl-8 pr-3 text-[12px] text-white outline-none placeholder:text-white/30 focus:border-[#3b82f6]"
            />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto nexus-scroll p-2">
          {GROUPS.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-3" : ""}>
              {group.label && (
                <div className="px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
                  {group.label}
                </div>
              )}
              {group.categories.map((cat) => {
                const matchCount = categoryMatches[cat.id] || 0;
                const visible = !query.trim() || matchCount > 0 || cat.label.toLowerCase().includes(query.trim().toLowerCase());
                if (!visible) return null;
                return (
                  <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                    className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition ${catRowStyle(cat.id)}`}>
                    <cat.icon className="h-4 w-4 shrink-0 text-[#60a5fa]/70" />
                    <span className="flex-1">{cat.label}</span>
                    {matchCount > 0 && (
                      <span className="rounded-full bg-[#3b82f6]/20 px-1.5 text-[10px] font-semibold text-[#60a5fa]">{matchCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {query.trim() && searchResults && searchResults.length === 0 && (
            <div className="px-3 py-6 text-center text-[12px] text-white/30">No matching settings</div>
          )}
        </nav>
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1 overflow-y-auto nexus-scroll">
        <div className="mx-auto max-w-2xl px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold text-white" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                {React.createElement(CATEGORY_MAP[activeCategory]?.icon || Settings2, { className: "h-5 w-5 text-[#60a5fa]" })}
                {CATEGORY_MAP[activeCategory]?.label}
              </h1>
              <p className="mt-1 text-[12.5px] text-white/45">{CATEGORY_MAP[activeCategory]?.desc}</p>
            </div>
            {query.trim() && searchResults && (
              <span className="rounded-full bg-[#3b82f6]/15 px-3 py-1 text-[11px] font-medium text-[#60a5fa]">
                {searchResults.length} match{searchResults.length === 1 ? "" : "es"}
              </span>
            )}
          </div>

          {/* Cross-category search results — shown inline when searching */}
          {query.trim() && searchResults && searchResults.length > 0 ? (
            <div className="mt-6 space-y-2">
              {searchResults.map((entry, i) => (
                <button key={i} onClick={() => { setActiveCategory(entry.category); setQuery(""); }}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left transition hover:border-[#3b82f6]/40 hover:bg-[#3b82f6]/5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.04]">
                    {React.createElement(CATEGORY_MAP[entry.category]?.icon || Settings2, { className: "h-4 w-4 text-[#60a5fa]" })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-white">{entry.label}</div>
                    <div className="truncate text-[11px] text-white/40">{CATEGORY_MAP[entry.category]?.label}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/30" />
                </button>
              ))}
            </div>
          ) : (
            <>
              {renderActive()}

              <div className="my-8 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-[11.5px] leading-relaxed text-white/40">
                Settings marked <span className="text-amber-300/80">native runtime</span> require the Nexus desktop/mobile shell to take effect.
                All others apply immediately and persist across sessions.
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reset confirmation */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfirmReset(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a0e18] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-[15px] font-semibold text-white">
              {confirmReset === "appearance" ? "Reset appearance?" : "Reset all settings?"}
            </div>
            <p className="mt-2 text-[13px] text-white/60">
              {confirmReset === "appearance"
                ? "This restores theme, accent, density, and visual effects to their defaults. Your data and bookmarks are untouched."
                : "This resets every Nexus preference to its default. Browser data (bookmarks, history, notes) is NOT deleted."}
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={() => setConfirmReset(null)} className="rounded-lg bg-white/[0.06] px-4 py-2 text-[13px] text-white/70 hover:bg-white/[0.1]">Cancel</button>
              <button onClick={doReset} className="rounded-lg bg-red-500/90 px-4 py-2 text-[13px] font-medium text-white hover:bg-red-500">Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Build a search index mapping settings labels → {category, terms}
function buildSearchIndex() {
  const entries = [
    { category: "appearance", label: "Theme", terms: ["theme", "appearance", "dark", "light", "dark mode", "light mode", "color"] },
    { category: "appearance", label: "Accent color", terms: ["accent", "color", "custom accent", "highlight"] },
    { category: "appearance", label: "Density", terms: ["density", "compact", "spacing"] },
    { category: "appearance", label: "UI scale", terms: ["ui scale", "zoom", "size"] },
    { category: "appearance", label: "Animations", terms: ["animations", "motion", "transitions"] },
    { category: "search", label: "Default search engine", terms: ["search engine", "search", "default", "google", "bing", "duckduckgo", "nexus search"] },
    { category: "search", label: "Search suggestions", terms: ["search", "suggestions", "autocomplete"] },
    { category: "search", label: "Search history", terms: ["search", "history"] },
    { category: "search", label: "Safe search", terms: ["safe search", "explicit", "content"] },
    { category: "tabs", label: "Tab position", terms: ["tabs", "tab position", "vertical tabs"] },
    { category: "tabs", label: "Tab previews", terms: ["tabs", "previews"] },
    { category: "tabs", label: "Sleeping tabs", terms: ["tabs", "sleeping", "memory"] },
    { category: "vfx", label: "Visual quality", terms: ["vfx", "visual", "graphics", "effects", "performance mode", "high quality", "ultra"] },
    { category: "performance", label: "Performance mode", terms: ["performance", "battery", "speed", "hardware"] },
    { category: "assistant", label: "Nexus Assistant", terms: ["assistant", "ai", "model", "conversation"] },
    { category: "privacy", label: "Tracking protection", terms: ["privacy", "tracking", "ad blocking", "cookies", "security"] },
    { category: "navigation", label: "URL handling", terms: ["url", "navigation", "address bar", "link"] },
    { category: "history", label: "Clear browsing data", terms: ["clear", "history", "browsing data", "delete"] },
    { category: "sidebar", label: "Sidebar", terms: ["sidebar", "panel", "navigation"] },
    { category: "extensions", label: "Extensions", terms: ["extensions", "addons", "plugins"] },
    { category: "downloads", label: "Downloads", terms: ["downloads", "save", "files"] },
    { category: "bookmarks", label: "Bookmarks", terms: ["bookmarks", "star", "saved"] },
    { category: "general", label: "Startup", terms: ["startup", "launch", "home", "homepage", "new tab"] },
    { category: "general", label: "Language", terms: ["language", "region", "locale"] },
    { category: "general", label: "Reset settings", terms: ["reset", "restore", "default", "export", "import", "configuration"] },
    { category: "audio", label: "UI sounds", terms: ["sound", "audio", "volume", "mute"] },
  ];
  return entries.map((e) => ({ ...e, terms: e.terms.map((t) => t.toLowerCase()) }));
}