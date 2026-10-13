import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Plus, Settings2, RotateCw, ExternalLink, X, Globe, AlertCircle,
  ChevronRight, Pin, PinOff, ArrowUp, ArrowDown, Pencil, Copy, Trash2, EyeOff, Eye,
} from "lucide-react";
import { useNexusSettings } from "./useNexusSettings";
import { useSound } from "./Sound";
import { useToast } from "@/components/ui/use-toast";
import { useSidePanelDock, WIDTH_MAP } from "./SidePanelStore";
import WebsiteManager from "./WebsiteManager";

/**
 * SidePanel — the Nexus Web App Dock.
 *
 * A premium, compact vertical rail of websites (Discord, YouTube, GitHub,
 * custom apps) kept permanently beside the main browsing area. Clicking an
 * icon opens that website inside the panel; the main tab is untouched.
 *
 * Design goals (§1–§34):
 *  - Websites ONLY. No Nexus tools, bookmarks, history, settings, or utilities.
 *  - Premium icon rail with polished active states, glow, and smooth motion.
 *  - Favicon-driven icons (real, detected — never invented).
 *  - Compact header for the open website with minimal controls.
 *  - Resizable width, position left/right, drag-and-drop reorder.
 *  - Persistent state per-user; restore last open site.
 *  - Honest about iframe limits (X-Frame-Options) — offers "Open in Main Tab".
 *  - No fake notification badges (§5) — we show none unless a real source exists.
 */

const RAIL_WIDTH = 56; // px, compact rail

export default function SidePanel({ open, onClose, activeUrl, nav, onNavigate, dock: dockProp, focusSiteId, onFocused }) {
  const { settings } = useNexusSettings();
  const { play } = useSound();
  const { toast } = useToast();
  const localDock = useSidePanelDock();
  const dock = dockProp || localDock;

  const [activeId, setActiveId] = useState(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { site, x, y }
  const [iframeError, setIframeError] = useState(null);
  const [loadedIds, setLoadedIds] = useState({});
  const iframeRefs = useRef({});

  // Smart narrow-window collapse (§19) — when the viewport is very narrow,
  // the dock auto-hides the website content and shows only the compact rail.
  const [narrowCollapse, setNarrowCollapse] = useState(false);
  useEffect(() => {
    const onResize = () => setNarrowCollapse(window.innerWidth < 680);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Restore last open website (§20, §23)
  useEffect(() => {
    if (dock.loaded && dock.dock.lastOpenId) {
      const exists = dock.visible.find((w) => w.id === dock.dock.lastOpenId);
      if (exists) setActiveId(dock.dock.lastOpenId);
    }
  }, [dock.loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // External focus command (fast switcher) — opens a specific site
  useEffect(() => {
    if (focusSiteId) {
      setActiveId(focusSiteId);
      setIframeError(null);
      dock.setLastOpen(focusSiteId);
      onFocused?.();
    }
  }, [focusSiteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openSite = useCallback((id) => {
    setActiveId(id);
    setIframeError(null);
    dock.setLastOpen(id);
    play("tabSwitch");
  }, [dock, play]);

  // Detect "refused to connect": onError rarely fires for X-Frame-Options/CSP
  // blocks on cross-origin iframes. Use a load timeout per site — if onLoad
  // hasn't fired for this site within 7s, treat it as blocked.
  useEffect(() => {
    if (!activeId) return;
    if (loadedIds[activeId]) { setIframeError(null); return; }
    setIframeError(null);
    const timer = setTimeout(() => {
      if (!loadedIds[activeId]) setIframeError(activeId);
    }, 7000);
    return () => clearTimeout(timer);
  }, [activeId, loadedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeSite = useMemo(
    () => dock.websites.find((w) => w.id === activeId) || null,
    [dock.websites, activeId]
  );

  const width = WIDTH_MAP[dock.dock.width] || 360;
  const position = dock.dock.position || "right";

  const refreshActive = useCallback(() => {
    const frame = iframeRefs.current[activeId];
    if (frame) {
      try { frame.contentWindow.location.reload(); } catch { /* cross-origin */ }
    }
    play("click");
  }, [activeId, play]);

  const openInMainTab = useCallback(() => {
    if (!activeSite) return;
    onNavigate(activeSite.url);
    toast({ title: `Opened ${activeSite.name} in main tab` });
  }, [activeSite, onNavigate, toast]);

  const copyUrl = useCallback((site) => {
    navigator.clipboard?.writeText(site.url).catch(() => {});
    toast({ title: "URL copied" });
  }, [toast]);

  // Detect iframe load failure (X-Frame-Options / CSP frame-ancestors) — honest handling (§24)
  const onIframeLoad = useCallback((id) => {
    setLoadedIds((prev) => ({ ...prev, [id]: true }));
    setIframeError(null);
  }, []);

  // Context menu actions (§15)
  const siteActions = useCallback((site) => [
    { label: "Open", icon: Globe, fn: () => openSite(site.id) },
    { label: "Open in Main Tab", icon: ExternalLink, fn: () => { onNavigate(site.url); toast({ title: `Opened ${site.name} in main tab` }); } },
    { label: "Reload", icon: RotateCw, fn: () => { const f = iframeRefs.current[site.id]; if (f) { try { f.contentWindow.location.reload(); } catch {} } } },
    { sep: true },
    { label: site.pinned ? "Unpin from rail" : "Pin to rail", icon: site.pinned ? PinOff : Pin, fn: () => dock.updateWebsite(site.id, { pinned: !site.pinned }) },
    { label: site.hidden ? "Show" : "Hide", icon: site.hidden ? Eye : EyeOff, fn: () => dock.updateWebsite(site.id, { hidden: !site.hidden }) },
    { label: "Rename", icon: Pencil, fn: () => { const n = prompt("Rename:", site.name); if (n?.trim()) dock.updateWebsite(site.id, { name: n.trim() }); } },
    { label: "Copy URL", icon: Copy, fn: () => copyUrl(site) },
    { sep: true },
    { label: "Remove", icon: Trash2, danger: true, fn: () => { dock.removeWebsite(site.id); toast({ title: `${site.name} removed` }); } },
  ], [dock, openSite, onNavigate, toast, copyUrl]);

  // Width cycling (§18) — narrow / normal / wide
  const cycleWidth = useCallback(() => {
    const order = ["narrow", "normal", "wide"];
    const next = order[(order.indexOf(dock.dock.width) + 1) % order.length];
    dock.update({ width: next });
  }, [dock]);

  if (!open) return null;

  const railContent = (
    <div
      className={`flex w-14 shrink-0 flex-col items-center bg-sidebar-background/80 backdrop-blur-xl ${
        position === "right" ? "border-l border-border/30" : "border-r border-border/30"
      }`}
      style={{ width: RAIL_WIDTH }}
    >
      {/* Scrollable icon list */}
      <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto nexus-scroll py-3">
        {dock.visible.length === 0 && !dock.loaded && (
          <div className="grid h-9 w-9 place-items-center">
            <div className="h-4 w-4 animate-pulse rounded-lg bg-muted" />
          </div>
        )}
        {dock.visible.length === 0 && dock.loaded && (
          <button
            onClick={() => setManagerOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-dashed border-border/40 text-muted-foreground/60 transition hover:border-accent/40 hover:text-accent"
            title="Add your first web app"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
        {dock.visible.map((site) => (
          <RailIcon
            key={site.id}
            site={site}
            active={activeId === site.id}
            onClick={() => openSite(site.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ site, x: e.clientX, y: e.clientY });
            }}
          />
        ))}
      </div>

      {/* Bottom actions (§6) */}
      <div className="flex shrink-0 flex-col items-center gap-1 border-t border-border/30 py-2">
        <button
          onClick={() => setManagerOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-accent/10 hover:text-accent"
          title="Manage web apps"
        >
          <Settings2 className="h-4 w-4" />
        </button>
        <button
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-accent/10 hover:text-accent"
          title="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const showContent = activeSite && !narrowCollapse;

  return (
    <>
      <div
        className={`flex shrink-0 ${position === "right" ? "flex-row" : "flex-row-reverse"} ${position === "right" ? "border-l" : "border-r"} border-border/40 bg-sidebar/60 backdrop-blur-xl`}
        style={{ width: RAIL_WIDTH + (showContent ? width : 0) }}
      >
        {/* Icon rail — always visible */}
        {position === "right" ? null : railContent}

        {/* Website content — only when a site is active and window is wide enough */}
        {showContent && (
          <div className="flex min-w-0 flex-1 flex-col" style={{ width }}>
            {/* Compact header (§16) */}
            <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/30 px-3">
              <img src={activeSite.favicon} alt="" className="h-5 w-5 rounded-sm" />
              <span className="flex-1 truncate text-[13px] font-semibold text-foreground">{activeSite.name}</span>
              <button onClick={refreshActive} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent/10 hover:text-accent" title="Reload">
                <RotateCw className="h-3.5 w-3.5" />
              </button>
              <button onClick={openInMainTab} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent/10 hover:text-accent" title="Open in main tab">
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
              <button onClick={cycleWidth} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent/10 hover:text-accent" title={`Width: ${dock.dock.width}`}>
                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${dock.dock.width === "wide" ? "rotate-180" : dock.dock.width === "narrow" ? "-rotate-90" : ""}`} />
              </button>
              <button onClick={() => setActiveId(null)} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent/10 hover:text-accent" title="Close website">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Website iframe — persistent per-site session via keyed iframes (§20) */}
            <div className="relative min-h-0 flex-1 bg-background">
              {iframeError === activeId && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background p-6 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-400">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <h3 className="text-[14px] font-semibold text-foreground">This site can't be embedded</h3>
                  <p className="max-w-[260px] text-[12px] leading-relaxed text-muted-foreground">
                    <span className="text-foreground">{activeSite.name}</span> blocks embedding via its security policy (X-Frame-Options / CSP). Open it in a main tab instead.
                  </p>
                  <button
                    onClick={openInMainTab}
                    className="rounded-lg bg-accent px-4 py-2 text-[12px] font-medium text-accent-foreground hover:opacity-90"
                  >
                    Open in Main Tab
                  </button>
                </div>
              )}
              {/* Keep all opened iframes mounted (hidden) so sessions persist (§20, §33) */}
              {dock.visible.map((site) => {
                if (site.id !== activeId && !iframeRefs.current[site.id]) return null; // lazy: only mount visited sites
                return (
                  <iframe
                    key={site.id}
                    ref={(el) => (iframeRefs.current[site.id] = el)}
                    src={site.url}
                    title={site.name}
                    className={`h-full w-full border-0 ${site.id === activeId ? "" : "hidden"}`}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
                    allow="clipboard-read; clipboard-write; fullscreen; picture-in-picture; autoplay"
                    loading="lazy"
                    onLoad={() => onIframeLoad(site.id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Icon rail */}
        {position === "right" ? railContent : null}
      </div>

      {/* Narrow-window overlay (§19) — when the viewport is very narrow, the
          website content floats over the main area instead of squeezing it. */}
      {narrowCollapse && activeSite && (
        <div
          className={`fixed top-0 z-30 flex h-full flex-col border-border/40 bg-sidebar shadow-2xl nx-reveal ${position === "right" ? "right-0 border-l" : "left-0 border-r"}`}
          style={{ width: Math.min(width, window.innerWidth - RAIL_WIDTH - 16) }}
        >
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/30 px-3">
            <button onClick={() => setActiveId(null)} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent/10 hover:text-accent" title="Back to rail">
              <ChevronRight className={`h-3.5 w-3.5 ${position === "right" ? "rotate-180" : ""}`} />
            </button>
            <img src={activeSite.favicon} alt="" className="h-5 w-5 rounded-sm" />
            <span className="flex-1 truncate text-[13px] font-semibold text-foreground">{activeSite.name}</span>
            <button onClick={refreshActive} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent/10 hover:text-accent" title="Reload">
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            <button onClick={openInMainTab} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent/10 hover:text-accent" title="Open in main tab">
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setActiveId(null)} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent/10 hover:text-accent" title="Close">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="relative min-h-0 flex-1 bg-background">
            {dock.visible.map((site) => {
              if (site.id !== activeId && !iframeRefs.current[site.id]) return null;
              return (
                <iframe
                  key={site.id}
                  ref={(el) => (iframeRefs.current[site.id] = el)}
                  src={site.url}
                  title={site.name}
                  className={`h-full w-full border-0 ${site.id === activeId ? "" : "hidden"}`}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
                  allow="clipboard-read; clipboard-write; fullscreen; picture-in-picture; autoplay"
                  loading="lazy"
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Context menu (§15) */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
          <div
            className="fixed z-[70] w-52 overflow-hidden rounded-xl border border-border/40 bg-popover py-1.5 shadow-2xl nx-reveal"
            style={{ left: Math.min(contextMenu.x, window.innerWidth - 220), top: Math.min(contextMenu.y, window.innerHeight - 300) }}
          >
            {siteActions(contextMenu.site).map((a, i) =>
              a.sep ? (
                <div key={i} className="my-1 h-px bg-border/30" />
              ) : (
                <button
                  key={i}
                  onClick={() => { a.fn(); setContextMenu(null); }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-[12px] transition ${
                    a.danger ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-accent/10 hover:text-accent"
                  }`}
                >
                  <a.icon className="h-3.5 w-3.5" />
                  {a.label}
                </button>
              )
            )}
          </div>
        </>
      )}

      {/* Manager */}
      <WebsiteManager
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        dock={dock}
        addWebsite={dock.addWebsite}
        removeWebsite={dock.removeWebsite}
        updateWebsite={dock.updateWebsite}
        reorder={dock.reorder}
        reset={dock.reset}
      />
    </>
  );
}

/**
 * RailIcon — a single website icon in the dock rail.
 * Premium active state: accent glow, smooth indicator, favicon (§2, §4).
 * No fake notification badges (§5).
 */
function RailIcon({ site, active, onClick, onContextMenu }) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`group relative grid h-10 w-10 place-items-center rounded-xl transition-all duration-200 ${
        active
          ? "bg-accent/15 shadow-[0_0_16px_hsl(var(--accent)/0.3)]"
          : "text-muted-foreground hover:bg-accent/10 hover:shadow-[0_0_8px_hsl(var(--accent)/0.12)]"
      }`}
      title={site.name}
    >
      {/* Active indicator bar */}
      <span
        className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent transition-all duration-200 ${
          active ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
        }`}
      />
      {imgFailed ? (
        <Globe className={`h-[18px] w-[18px] ${active ? "text-accent" : "text-muted-foreground"}`} />
      ) : (
        <img
          src={site.favicon}
          alt=""
          className={`h-[18px] w-[18px] rounded-sm transition ${active ? "" : "opacity-80 group-hover:opacity-100"}`}
          onError={() => setImgFailed(true)}
        />
      )}
    </button>
  );
}