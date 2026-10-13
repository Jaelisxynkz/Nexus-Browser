import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import TabBar from "@/components/nexus/TabBar";
import NavBar from "@/components/nexus/NavBar";
import BookmarksBar from "@/components/nexus/BookmarksBar";
import Sidebar from "@/components/nexus/Sidebar";
import StartPage from "@/components/nexus/StartPage";
import IncognitoStartPage from "@/components/nexus/IncognitoStartPage";
import AssistantDrawer from "@/components/nexus/AssistantDrawer";
import SidePanel from "@/components/nexus/SidePanel";
import WebView from "@/components/nexus/WebView";
import MenuPanel from "@/components/nexus/MenuPanel";
import CommandCenter from "@/components/nexus/CommandCenter";
import QuickSettings from "@/components/nexus/QuickSettings";
import ReaderMode from "@/components/nexus/ReaderMode";
import SelectionContext from "@/components/nexus/SelectionContext";
import { HistoryView, BookmarksView } from "@/components/nexus/Views";
import ReadingListView from "@/components/nexus/views/ReadingListView";
import SearchView from "@/components/nexus/views/SearchView";
import NotesView from "@/components/nexus/views/NotesView";
import PremiumView from "@/components/nexus/views/PremiumView";
import VpnView from "@/components/nexus/views/VpnView";
import DiagnosticsView from "@/components/nexus/views/DiagnosticsView";
import PerformanceView from "@/components/nexus/views/PerformanceView";
import NativeBoundaryView from "@/components/nexus/views/NativeBoundaryView";
import SettingsView from "@/components/nexus/views/SettingsView";
import WorkspacesView from "@/components/nexus/views/WorkspacesView";
import PrivacyView from "@/components/nexus/views/PrivacyView";
import SecurityView from "@/components/nexus/views/SecurityView";
import TabsView from "@/components/nexus/views/TabsView";
import DownloadsView from "@/components/nexus/views/DownloadsView";
import SessionManager from "@/components/nexus/views/SessionManager";
import NexusToolbox from "@/components/nexus/NexusToolbox";
import LabsView from "@/components/nexus/views/LabsView";
import { EyeOff, AlertTriangle } from "lucide-react";
import KeyboardShortcutsView from "@/components/nexus/views/KeyboardShortcutsView";
import UpdateCenterView from "@/components/nexus/views/UpdateCenterView";
import DownloadView from "@/components/nexus/views/DownloadView";
import InstallGate from "@/components/nexus/InstallGate";
import RecoveryModeView from "@/components/nexus/views/RecoveryModeView";
import DefaultBrowserView from "@/components/nexus/views/DefaultBrowserView";
import SpatialCanvas from "@/components/nexus/SpatialCanvas";
import SplitView from "@/components/nexus/SplitView";
import FirstLaunchWizard, { isFirstLaunchComplete } from "@/components/nexus/FirstLaunchWizard";
import useSidePanelShortcuts from "@/components/nexus/useSidePanelShortcuts";
import { useSidePanelDock } from "@/components/nexus/SidePanelStore";
import FastWebsiteSwitcher from "@/components/nexus/FastWebsiteSwitcher";
import CrashRecoveryDialog from "@/components/nexus/CrashRecoveryDialog";
import { beginHeartbeat, detectAbnormalShutdown, clearRecovery, loadLastSession } from "@/components/nexus/crashRecovery";
import { loadSessions, snapshotTabs } from "@/components/nexus/sessionStore";
import { getUpdateManager, UPDATE_STATUS } from "@/components/nexus/updateManager";
import UpdateBanner from "@/components/nexus/UpdateBanner";
import { EntitlementProvider } from "@/components/nexus/Entitlements";
import { NexusSettingsProvider, useNexusSettings } from "@/components/nexus/useNexusSettings";
import { ThemeProvider, useTheme } from "@/components/nexus/Theme";
import { SoundProvider, useSound } from "@/components/nexus/Sound";
import { ForceDarkProvider, useForceDark } from "@/components/nexus/ForceDark";
import { FeatureStatusProvider } from "@/components/nexus/FeatureStatus";
import { VfxProvider } from "@/components/nexus/Vfx";
import { usePrivacy } from "@/components/nexus/usePrivacy";
import SiteProtection from "@/components/nexus/SiteProtection";
import IncognitoChrome, { IncognitoBadge } from "@/components/nexus/IncognitoChrome";
import FingerprintView from "@/components/nexus/views/FingerprintView";
import ShieldView from "@/components/nexus/views/ShieldView";
import PermissionsView from "@/components/nexus/views/PermissionsView";
import TransparencyView from "@/components/nexus/views/TransparencyView";
import PrivacyAuditView from "@/components/nexus/views/PrivacyAuditView";
import SiteCheckView from "@/components/nexus/views/SiteCheckView";
import SearchPrivacyView from "@/components/nexus/views/SearchPrivacyView";
import { stripTrackingFromUrl } from "@/components/nexus/privacyEngine";
import { viewForUrl } from "@/components/nexus/routes";
import useBrowser, { faviconFor } from "@/components/nexus/useBrowser";
import { useToast } from "@/components/ui/use-toast";

function Shell() {
  const nav = useBrowser();
  const { settings, update, loaded: settingsLoaded } = useNexusSettings();
  const { cycleTheme } = useTheme();
  const { toggleMute } = useSound();
  const { toggleGlobal } = useForceDark();
  const { privacy, security, privateOn, updatePrivacy, enterPrivate, exitPrivate } = usePrivacy();
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const dock = useSidePanelDock();
  const [fastSwitchOpen, setFastSwitchOpen] = useState(false);
  const [focusSiteId, setFocusSiteId] = useState(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const [bookmarkRefresh, setBookmarkRefresh] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState(null);
  const [selectedTabIds, setSelectedTabIds] = useState([]);
  const [spatialOpen, setSpatialOpen] = useState(false);
  const [splitMode, setSplitMode] = useState(null); // null | "horizontal" | "vertical" | "grid"
  const [splitPanes, setSplitPanes] = useState([]); // [{id, tab, size}]
  const [showWizard, setShowWizard] = useState(() => !isFirstLaunchComplete());
  const [crashInfo] = useState(() => detectAbnormalShutdown());
  const [showCrash, setShowCrash] = useState(() => detectAbnormalShutdown().crashed);
  const [siteProtectionOpen, setSiteProtectionOpen] = useState(false);
  const [confirmClosePrivate, setConfirmClosePrivate] = useState(false);
  const { toast } = useToast();

  const activeUrl = nav.active.url;
  const isWeb = !activeUrl.startsWith("nexus://");

  // Start automatic background update checks so users are always running the
  // latest Nexus release without manual intervention. Respects the user's
  // autoUpdateChecks setting; cleans up on unmount.
  useEffect(() => {
    const um = getUpdateManager();
    const enabled = settings.autoUpdateChecks !== false;
    const intervalHours = settings.updateCheckIntervalHours || 4;
    um.startAutoCheck({ enabled, intervalHours });
    return () => um.stopAutoCheck();
  }, [settings.autoUpdateChecks, settings.updateCheckIntervalHours]);

  // Apply tracking-parameter stripping on navigation. Only strips known
  // marketing params; leaves everything else untouched. Reports only when it changed.
  useEffect(() => {
    if (!isWeb || !privacy?.stripTrackingParams) return;
    const cleaned = stripTrackingFromUrl(activeUrl);
    if (cleaned && cleaned !== activeUrl) {
      toast({ title: "Tracking parameter removed", description: "Nexus stripped known tracking params from this URL." });
      nav.navigate(cleaned);
    }
  }, [activeUrl, isWeb, privacy, nav, toast]);

  const route = isWeb ? null : viewForUrl(activeUrl);
  const searchQuery = !isWeb && activeUrl.startsWith("nexus://search?q=")
    ? decodeURIComponent(activeUrl.split("q=")[1] || "")
    : null;

  useEffect(() => {
    if (isWeb) {
      base44.entities.Bookmark.filter({ url: activeUrl })
        .then((r) => setBookmarked(r.length > 0))
        .catch(() => {});
    } else {
      setBookmarked(false);
    }
  }, [activeUrl, isWeb, bookmarkRefresh]);

  const toggleBookmark = useCallback(async () => {
    const url = nav.active.url;
    if (url.startsWith("nexus://")) return;
    if (bookmarked) {
      const found = await base44.entities.Bookmark.filter({ url });
      if (found[0]) await base44.entities.Bookmark.delete(found[0].id).catch(() => {});
      setBookmarked(false);
      toast({ title: "Bookmark removed" });
    } else {
      await base44.entities.Bookmark.create({ title: nav.active.title, url, favicon: faviconFor(url), pinned: true }).catch(() => {});
      setBookmarked(true);
      toast({ title: "Bookmarked" });
    }
    setBookmarkRefresh((k) => k + 1);
  }, [nav.active, bookmarked, toast]);

  const saveToReadingList = useCallback(async () => {
    const url = nav.active.url;
    if (url.startsWith("nexus://")) return;
    try {
      const existing = await base44.entities.Bookmark.filter({ url, tags: { $in: ["readinglist"] } });
      if (existing[0]) {
        toast({ title: "Already in your reading list" });
        return;
      }
      await base44.entities.Bookmark.create({
        title: nav.active.title,
        url,
        favicon: faviconFor(url),
        pinned: false,
        tags: ["readinglist"],
      });
      toast({ title: "Saved to Reading List" });
    } catch {
      toast({ title: "Couldn't save to reading list", variant: "destructive" });
    }
  }, [nav.active, toast]);

  const navigateAndShow = useCallback((input) => { nav.navigate(input); }, [nav]);
  const goInternal = useCallback((u) => nav.navigate(u), [nav]);

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((o) => !o); return; }
      const k = e.key.toLowerCase();
      if (mod && e.shiftKey) {
        if (k === "t" && nav.recentlyClosed[0]) { e.preventDefault(); nav.restoreTab(nav.recentlyClosed[0]); return; }
        if (k === "s") { e.preventDefault(); setQuickSettingsOpen((o) => !o); return; }
        if (k === "r") { e.preventDefault(); setReaderOpen((o) => !o); return; }
        if (k === "c") { e.preventDefault(); setSpatialOpen((o) => !o); return; }
        if (k === "n") { e.preventDefault(); nav.newTab({ incognito: true }); toast({ title: "Incognito tab opened", description: "History, cookies, and site data aren't saved." }); return; }
      } else if (mod) {
        if (k === "t") { e.preventDefault(); nav.newTab(); return; }
        if (k === "w") { e.preventDefault(); nav.closeTab(nav.activeId); return; }
        if (k === "d") { e.preventDefault(); toggleBookmark(); return; }
        if (k === "r") { e.preventDefault(); nav.reload(); return; }
        if (/^[1-9]$/.test(e.key)) {
          e.preventDefault();
          const target = e.key === "9" ? nav.tabs[nav.tabs.length - 1] : nav.tabs[Number(e.key) - 1];
          if (target) nav.setActiveId(target.id);
          return;
        }
        if (e.key === "Tab") {
          e.preventDefault();
          const idx = nav.tabs.findIndex((t) => t.id === nav.activeId);
          const dir = e.shiftKey ? -1 : 1;
          nav.setActiveId(nav.tabs[(idx + dir + nav.tabs.length) % nav.tabs.length].id);
          return;
        }
      }
      if (e.altKey && e.key.toLowerCase() === "s") { e.preventDefault(); setFastSwitchOpen((o) => !o); }
      if (e.altKey && e.key === "ArrowLeft") nav.goBack();
      if (e.altKey && e.key === "ArrowRight") nav.goForward();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav, toggleBookmark]);

  const focusSite = useCallback((id) => {
    setSidePanelOpen(true);
    setFocusSiteId(id);
  }, []);

  const cycleSite = useCallback((dir) => {
    const sites = dock.visible;
    if (sites.length === 0) return;
    const cur = dock.dock.lastOpenId;
    const idx = sites.findIndex((w) => w.id === cur);
    const next = sites[(idx + dir + sites.length) % sites.length] || sites[0];
    focusSite(next.id);
  }, [dock, focusSite]);

  useSidePanelShortcuts({
    open: sidePanelOpen,
    setOpen: setSidePanelOpen,
    dock,
    onCycle: cycleSite,
  });

  const askAssistant = (prompt) => { setAssistantOpen(true); setPendingPrompt(prompt); };

  // --- Heartbeat for crash detection; reads live tabs through a ref so snapshots are never stale ---
  const tabsRef = useRef(nav.tabs);
  tabsRef.current = nav.tabs;
  const startupSession = useRef(loadLastSession());
  useEffect(() => {
    const stop = beginHeartbeat(() => ({
      tabs: tabsRef.current
        .filter((t) => t.url !== "nexus://start")
        .map((t) => ({ url: t.url, title: t.title, pinned: !!t.pinned })),
    }));
    return stop;
  }, []);

  // --- "Continue where you left off" — restore last session once settings are loaded ---
  const startupDone = useRef(false);
  useEffect(() => {
    if (!settingsLoaded || startupDone.current) return;
    startupDone.current = true;
    if (showCrash) return; // crash dialog owns restoration
    const last = startupSession.current;
    if (settings.startup === "continue" && last?.tabs?.length) {
      nav.openTabs(last.tabs, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded]);

  const handleCrashRestore = () => {
    setShowCrash(false);
    const saved = crashInfo.session?.tabs || [];
    clearRecovery();
    if (saved.length) {
      nav.openTabs(saved, { replace: true });
      toast({ title: "Session restored", description: `Reopened ${saved.length} tab${saved.length === 1 ? "" : "s"}.` });
    } else {
      toast({ title: "Nothing to restore", description: "No tabs were open in the previous session." });
    }
  };
  const handleCrashClean = () => {
    setShowCrash(false);
    clearRecovery();
    nav.newTab();
    toast({ title: "Started clean" });
  };

  // --- Split View management ---
  const startSplit = useCallback((layout) => {
    const openTabs = nav.tabs.filter((t) => !t.url.startsWith("nexus://"));
    if (openTabs.length < 2) {
      toast({ title: "Need at least 2 open web tabs to split", variant: "destructive" });
      return;
    }
    const count = layout === "grid" ? 4 : 2;
    const panes = openTabs.slice(0, count).map((t, i) => ({ id: `pane-${i}`, tab: t, size: 1 / count }));
    setSplitPanes(panes);
    setSplitMode(layout);
  }, [nav.tabs, toast]);

  const exitSplit = useCallback(() => { setSplitMode(null); setSplitPanes([]); }, []);

  const resizePane = useCallback((id, size) => {
    setSplitPanes((prev) => prev.map((p) => (p.id === id ? { ...p, size } : p)));
  }, []);

  const closePane = useCallback((id) => {
    setSplitPanes((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (next.length < 2) { setSplitMode(null); return []; }
      return next;
    });
  }, []);

  const swapPane = useCallback((id) => {
    setSplitPanes((prev) => {
      if (prev.length < 2) return prev;
      const idx = prev.findIndex((p) => p.id === id);
      const other = idx === 0 ? 1 : 0;
      const next = [...prev];
      [next[idx].tab, next[other].tab] = [next[other].tab, next[idx].tab];
      return next;
    });
  }, []);

  const maximizePane = useCallback((id) => {
    setSplitPanes((prev) => prev.map((p) => (p.id === id ? { ...p, size: 0.98 } : { ...p, size: 0.02 })));
  }, []);

  const openSpatial = useCallback(() => {
    if (nav.tabs.filter((t) => !t.url.startsWith("nexus://")).length === 0) {
      toast({ title: "Open a web tab first to use Spatial Canvas", variant: "destructive" });
      return;
    }
    setSpatialOpen(true);
  }, [nav.tabs, toast]);

  const handleCommand = useCallback(async (action, arg) => {
    if (action === "newTab") nav.newTab();
    else if (action === "closeTab") nav.closeTab(nav.activeId);
    else if (action === "reload") nav.reload();
    else if (action === "assistant") setAssistantOpen(true);
    else if (action === "switchTab") nav.setActiveId(arg);
    else if (action === "go") nav.navigate(arg);
    else if (action === "goBack") nav.goBack();
    else if (action === "goForward") nav.goForward();
    else if (action === "goHome") nav.goHome();
    else if (action === "duplicateTab") nav.duplicateTab(nav.activeId);
    else if (action === "togglePin") nav.togglePin(nav.activeId);
    else if (action === "sidePanel") setSidePanelOpen((o) => !o);
    else if (action === "saveSession") {
      const snap = snapshotTabs(nav.tabs, nav.activeId);
      toast({ title: "Session saved", description: `"${snap.name}" — ${snap.tabs.length} tabs` });
    }
    else if (action === "restoreSession") {
      const latest = loadSessions()[0];
      if (!latest) { toast({ title: "No saved sessions yet", description: "Save one first from the Command Center or Session Vault." }); }
      else { nav.openTabs(latest.tabs); toast({ title: "Session restored", description: `"${latest.name}" — ${latest.tabs.length} tabs` }); }
    }
    else if (action === "clearHistory") {
      try {
        await base44.entities.HistoryEntry.deleteMany({});
        toast({ title: "Browsing history cleared" });
      } catch {
        toast({ title: "Couldn't clear history", variant: "destructive" });
      }
    }
    else if (action === "toggleSound") {
      const muted = toggleMute();
      toast({ title: muted ? "Sounds muted" : "Sounds on" });
    }
    else if (action === "toggleForceDark") {
      const next = toggleGlobal();
      toast({ title: next === "on" ? "Force Dark on for websites" : "Force Dark off" });
    }
    else if (action === "cycleTheme") {
      const label = cycleTheme();
      toast({ title: `Theme: ${label}` });
    }
    else if (action === "performanceMode") {
      const order = ["performance", "balanced", "high", "ultra"];
      const idx = order.indexOf(settings.performanceMode || "balanced");
      const next = order[(idx + 1) % order.length];
      update("performanceMode", next);
      update("vfxQuality", next);
      toast({ title: `Performance: ${next.charAt(0).toUpperCase() + next.slice(1)}` });
    }
    else if (action === "screenshot") toast({ title: "Screenshot — Native Runtime Required", variant: "destructive" });
    else if (action === "splitH") startSplit("horizontal");
    else if (action === "splitV") startSplit("vertical");
    else if (action === "splitGrid") startSplit("grid");
    else if (action === "spatial") openSpatial();
    else if (action === "enterPrivate") { nav.newTab({ incognito: true }); toast({ title: "Incognito tab opened", description: "History, cookies, and site data aren't saved." }); }
    else if (action === "closePrivate") setConfirmClosePrivate(true);
  }, [nav, toast, startSplit, openSpatial, settings.performanceMode, update, toggleMute, toggleGlobal, cycleTheme]);

  const handleTabAction = useCallback((action, tab) => {
    const url = tab.url;
    switch (action) {
      case "reload": nav.navigate(url, tab.id); break;
      case "duplicate": nav.duplicateTab(tab.id); break;
      case "pin": nav.togglePin(tab.id); break;
      case "mute": toast({ title: "Mute — per-tab audio requires native runtime" }); break;
      case "bookmark": toggleBookmark(); break;
      case "readinglist": saveToReadingList(); break;
      case "copyUrl": navigator.clipboard?.writeText(url).catch(() => {}); toast({ title: "URL copied" }); break;
      case "share": navigator.share?.({ title: tab.title, url }).catch(() => toast({ title: "Share not available" })); break;
      case "forceDark": toast({ title: "Force Dark — use Site Controls" }); break;
      case "close": nav.closeTab(tab.id); break;
      case "closeOthers": nav.closeMany(nav.tabs.filter((t) => t.id !== tab.id && !t.pinned).map((t) => t.id), tab.id); break;
      case "closeRight": {
        const idx = nav.tabs.findIndex((t) => t.id === tab.id);
        nav.closeMany(nav.tabs.slice(idx + 1).filter((t) => !t.pinned).map((t) => t.id), tab.id); break;
      }
      default: break;
    }
  }, [nav, toast, toggleBookmark, saveToReadingList]);

  const renderMain = () => {
    if (isWeb) return <WebView tab={nav.active} />;
    switch (route) {
      case "search":
        return <div className="h-full overflow-y-auto nexus-scroll"><SearchView initialQuery={searchQuery} onNavigate={navigateAndShow} /></div>;
      case "history":
        return <div className="h-full overflow-y-auto nexus-scroll"><HistoryView onNavigate={navigateAndShow} /></div>;
      case "bookmarks":
        return <div className="h-full overflow-y-auto nexus-scroll"><BookmarksView onNavigate={navigateAndShow} /></div>;
      case "readinglist":
        return <div className="h-full overflow-y-auto nexus-scroll"><ReadingListView onNavigate={navigateAndShow} /></div>;
      case "notes":
        return <NotesView />;
      case "premium":
        return <div className="h-full overflow-y-auto nexus-scroll"><PremiumView /></div>;
      case "vpn":
        return <div className="h-full overflow-y-auto nexus-scroll"><VpnView onOpenPremium={() => goInternal("nexus://premium")} /></div>;
      case "diagnostics":
        return <div className="h-full overflow-y-auto nexus-scroll"><DiagnosticsView /></div>;
      case "performance":
        return <div className="h-full overflow-y-auto nexus-scroll"><PerformanceView tabCount={nav.tabs.length} /></div>;
      case "privacy":
        return <div className="h-full overflow-y-auto nexus-scroll"><PrivacyView /></div>;
      case "security":
        return <div className="h-full overflow-y-auto nexus-scroll"><SecurityView /></div>;
      case "shield":
        return <div className="h-full overflow-y-auto nexus-scroll"><ShieldView activeUrl={nav.active.url} /></div>;
      case "fingerprint":
        return <div className="h-full overflow-y-auto nexus-scroll"><FingerprintView /></div>;
      case "permissions":
        return <div className="h-full overflow-y-auto nexus-scroll"><PermissionsView /></div>;
      case "transparency":
        return <div className="h-full overflow-y-auto nexus-scroll"><TransparencyView /></div>;
      case "audit":
        return <div className="h-full overflow-y-auto nexus-scroll"><PrivacyAuditView /></div>;
      case "incognito":
        return <div className="h-full overflow-y-auto nexus-scroll"><IncognitoLanding onEnter={enterPrivate} onExit={() => setConfirmClosePrivate(true)} active={privateOn} privacy={privacy} /></div>;
      case "insecure-blocked": {
        const blockedUrl = new URLSearchParams(activeUrl.split("?")[1] || "").get("url") || "";
        return (
          <div className="mx-auto max-w-lg px-6 py-16 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/15 text-rose-400"><AlertTriangle className="h-7 w-7" /></div>
            <h1 className="mt-4 text-xl font-bold text-foreground">Insecure connection blocked</h1>
            <p className="mt-2 text-[12px] text-muted-foreground">HTTPS-Only is set to Strict. Nexus won't silently open this HTTP page.</p>
            {blockedUrl && <div className="mt-3 truncate rounded-lg border border-border/40 bg-card/40 px-3 py-2 text-[11px] text-muted-foreground">{blockedUrl}</div>}
            <div className="mt-5 flex justify-center gap-2">
              <button onClick={() => goInternal("nexus://privacy")} className="rounded-lg border border-border/40 px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-muted">Privacy settings</button>
              <a href={blockedUrl || "#"} target="_blank" rel="noreferrer" className="rounded-lg bg-accent px-3 py-1.5 text-[12px] font-medium text-accent-foreground hover:opacity-90">Open anyway (new window)</a>
            </div>
          </div>
        );
      }
      case "site-check": {
        const params = new URLSearchParams(activeUrl.split("?")[1] || "");
        const checkUrl = params.get("url") || "";
        const checkQuery = params.get("q") || "";
        return <div className="h-full overflow-y-auto nexus-scroll"><SiteCheckView url={checkUrl} query={checkQuery} onNavigate={navigateAndShow} onBack={() => goInternal("nexus://search")} /></div>;
      }
      case "search-privacy":
        return <div className="h-full overflow-y-auto nexus-scroll"><SearchPrivacyView onNavigate={goInternal} /></div>;
      case "settings":
        return <div className="h-full overflow-y-auto nexus-scroll"><SettingsView /></div>;
      case "workspaces":
        return <div className="h-full overflow-y-auto nexus-scroll"><WorkspacesView /></div>;
      case "tabs":
        return <div className="h-full overflow-y-auto nexus-scroll">
          <TabsView tabs={nav.tabs} activeId={nav.activeId} onSelect={nav.setActiveId} onClose={nav.closeTab}
            onDuplicate={nav.duplicateTab} onTogglePin={nav.togglePin} onRestore={nav.restoreTab} recentlyClosed={nav.recentlyClosed} />
        </div>;
      case "extensions":
        return <NativeBoundaryView kind="extensions" />;
      case "ai-models":
        return <NativeBoundaryView kind="ai-models" />;
      case "assistant":
        return nav.active?.incognito
          ? <IncognitoStartPage onNavigate={navigateAndShow} onOpenAssistant={() => setAssistantOpen(true)} />
          : <StartPage onOpenAssistant={() => setAssistantOpen(true)} onNavigate={navigateAndShow} onAskAssistant={askAssistant} />;
      case "downloads":
        return <div className="h-full overflow-y-auto nexus-scroll"><DownloadsView /></div>;
      case "sessions":
        return <div className="h-full overflow-y-auto nexus-scroll"><SessionManager tabs={nav.tabs} activeId={nav.activeId} onRestore={(list) => nav.openTabs(list)} /></div>;
      case "toolbox":
        return <NexusToolbox />;
      case "labs":
        return <div className="h-full overflow-y-auto nexus-scroll"><LabsView /></div>;
      case "keyboard":
        return <div className="h-full overflow-y-auto nexus-scroll"><KeyboardShortcutsView /></div>;
      case "updates":
        return <div className="h-full overflow-y-auto nexus-scroll"><UpdateCenterView onNavigate={goInternal} /></div>;
      case "download":
        return <DownloadView />;
      case "recovery":
        return <div className="h-full overflow-y-auto nexus-scroll"><RecoveryModeView onNavigate={goInternal} /></div>;
      case "default-browser":
        return <div className="h-full overflow-y-auto nexus-scroll"><DefaultBrowserView /></div>;
      default:
        return nav.active?.incognito
          ? <IncognitoStartPage onNavigate={navigateAndShow} onOpenAssistant={() => setAssistantOpen(true)} />
          : <StartPage onOpenAssistant={() => setAssistantOpen(true)} onNavigate={navigateAndShow} onAskAssistant={askAssistant} />;
    }
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background text-foreground" data-private={privateOn ? "on" : "off"}>
      {privateOn && (
        <div className="flex items-center justify-between border-b border-violet-500/20 bg-violet-500/5 px-4 py-1">
          <span className="flex items-center gap-2 text-[11px] text-violet-200/90"><IncognitoBadge /> Global private session — Nexus-owned data is kept separate and cleared on close.</span>
          <button onClick={() => setConfirmClosePrivate(true)} className="text-[11px] text-violet-300 hover:text-violet-200">Close private session</button>
        </div>
      )}
      <TabBar
        tabs={nav.tabs}
        activeId={nav.activeId}
        onSelect={nav.setActiveId}
        onClose={nav.closeTab}
        onNew={nav.newTab}
        onNewIncognito={() => { const id = nav.newTab({ incognito: true }); toast({ title: "Incognito tab opened", description: "History, cookies, and site data aren't saved." }); return id; }}
        privateOn={privateOn}
        onAction={handleTabAction}
        selectedIds={selectedTabIds}
        onToggleSelect={(id) =>
          setSelectedTabIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
          )
        }
        onClearSelection={() => setSelectedTabIds([])}
      />
      <NavBar
        active={nav.active}
        nav={nav}
        onToggleAssistant={() => setAssistantOpen((o) => !o)}
        onToggleSidePanel={() => setSidePanelOpen((o) => !o)}
        sidePanelOpen={sidePanelOpen}
        onToggleMenu={() => setMenuOpen((o) => !o)}
        bookmarked={bookmarked}
        onBookmark={toggleBookmark}
        onSaveReadingList={saveToReadingList}
        onOpenVpn={() => goInternal("nexus://vpn")}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenQuickSettings={() => setQuickSettingsOpen((o) => !o)}
        onOpenReader={() => setReaderOpen(true)}
        onOpenSiteProtection={() => setSiteProtectionOpen((o) => !o)}
        privateOn={privateOn}
        incognito={nav.active?.incognito}
      />
      {settings.bookmarkBar && <BookmarksBar onNavigate={navigateAndShow} refreshKey={bookmarkRefresh} />}

      <div className="flex min-h-0 flex-1">
        {settings.sidebarEnabled && <Sidebar
          view={route || "web"}
          onHome={() => goInternal("nexus://home")}
          tabCount={nav.tabs.length}
          onNavigateView={(v) => {
            if (v === "assistant") return setAssistantOpen(true);
            goInternal("nexus://" + v);
          }}
        />}
        <div className="relative min-w-0 flex-1 overflow-hidden">
          {siteProtectionOpen && isWeb && <SiteProtection url={nav.active.url} onClose={() => setSiteProtectionOpen(false)} />}
          {renderMain()}
        </div>
        {sidePanelOpen && (
          <SidePanel open={sidePanelOpen} onClose={() => setSidePanelOpen(false)} activeUrl={nav.active.url}
            nav={nav} onNavigate={navigateAndShow} dock={dock} focusSiteId={focusSiteId}
            onFocused={() => setFocusSiteId(null)} />
        )}
      </div>

      <AssistantDrawer
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        activeUrl={nav.active.url}
        pendingPrompt={pendingPrompt}
        onConsumePrompt={() => setPendingPrompt(null)}
      />

      <FastWebsiteSwitcher
        open={fastSwitchOpen}
        onClose={() => setFastSwitchOpen(false)}
        dock={dock}
        onSelect={focusSite}
      />

      <MenuPanel open={menuOpen} onClose={() => setMenuOpen(false)} onNewTab={nav.newTab}
        onShowHistory={() => goInternal("nexus://history")} onShowBookmarks={() => goInternal("nexus://bookmarks")} />
      <CommandCenter open={paletteOpen} onClose={() => setPaletteOpen(false)} onCommand={handleCommand} tabs={nav.tabs} />
      {quickSettingsOpen && <QuickSettings onClose={() => setQuickSettingsOpen(false)} />}
      {readerOpen && isWeb && <ReaderMode url={nav.active.url} onClose={() => setReaderOpen(false)} />}
      <SelectionContext onAskAssistant={askAssistant} onNavigate={navigateAndShow} />
      {splitMode && (
        <div className="absolute inset-0 top-[96px] z-20">
          <SplitView
            layout={splitMode}
            panes={splitPanes}
            onResize={resizePane}
            onClosePane={closePane}
            onSwap={swapPane}
            onMaximize={maximizePane}
            onExit={exitSplit}
          />
        </div>
      )}
      {spatialOpen && (
        <SpatialCanvas
          tabs={nav.tabs.filter((t) => !t.url.startsWith("nexus://"))}
          onFocusTab={(id) => { nav.setActiveId(id); setSpatialOpen(false); }}
          onCloseTab={(id) => nav.closeTab(id)}
          onCloseCanvas={() => setSpatialOpen(false)}
        />
      )}
      <UpdateBanner onNavigateUpdates={() => goInternal("nexus://updates")} />
      {showWizard && (
        <FirstLaunchWizard onComplete={() => setShowWizard(false)} />
      )}
      {showCrash && (
        <CrashRecoveryDialog
          onRestore={handleCrashRestore}
          onClean={handleCrashClean}
          onDiagnostics={() => { setShowCrash(false); clearRecovery(); goInternal("nexus://recovery"); }}
        />
      )}
      <IncognitoChrome
        open={confirmClosePrivate}
        active={privateOn}
        onConfirm={() => { exitPrivate(); setConfirmClosePrivate(false); toast({ title: "Private session closed", description: "Nexus-owned private data cleared." }); }}
        onCancel={() => setConfirmClosePrivate(false)}
      />
    </div>
  );
}

function IncognitoLanding({ onEnter, onExit, active, privacy }) {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center px-6 py-16">
      {/* Subtle violet ambient glow — premium, not obtrusive */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/10 blur-[120px]" />
      </div>
      <div className="relative flex flex-col items-center text-center">
        <div className="grid h-20 w-20 place-items-center rounded-3xl bg-violet-500/10 ring-1 ring-violet-500/20">
          <EyeOff className="h-10 w-10 text-violet-300" />
        </div>
        <h1 className="mt-6 text-2xl font-bold font-display text-foreground">You're incognito</h1>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground">
          Nexus won't save your private browsing history, search terms, or workspace state.
          They're cleared when you close all private tabs.
        </p>
        {active ? (
          <div className="mt-8 flex items-center gap-2">
            <IncognitoBadge />
            <button onClick={onExit} className="rounded-lg bg-violet-600 px-4 py-2 text-[12px] font-medium text-white transition hover:bg-violet-500">
              Close Private Session
            </button>
          </div>
        ) : (
          <button onClick={onEnter} className="mt-8 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-violet-500">
            <EyeOff className="h-4 w-4" /> Start Private Browsing
          </button>
        )}
      </div>
      <div className="relative mt-10 w-full max-w-md rounded-xl border border-border/40 bg-card/40 p-4 text-[11.5px] leading-relaxed text-muted-foreground/80">
        <div className="mb-1.5 font-medium text-foreground">What private mode does</div>
        Keeps Nexus-owned data separate, never restores private tabs after restart, and clears private state on close.
        <div className="mt-2 text-amber-400/80"><b>What it doesn't do:</b> make you invisible. Your ISP, employer, and the sites you visit can still see your activity. Full cookie/cache isolation needs the native runtime.</div>
      </div>
    </div>
  );
}

function HomeInner() {
  return (
    <ForceDarkProvider>
      <FeatureStatusProvider>
        <EntitlementProvider>
          <SoundProvider>
            <VfxProvider>
              <InstallGate>
                <Shell />
              </InstallGate>
            </VfxProvider>
          </SoundProvider>
        </EntitlementProvider>
      </FeatureStatusProvider>
    </ForceDarkProvider>
  );
}

export default function Home() {
  return (
    <NexusSettingsProvider>
      <ThemeProvider>
        <HomeInner />
      </ThemeProvider>
    </NexusSettingsProvider>
  );
}