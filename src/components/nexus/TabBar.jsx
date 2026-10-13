import React, { useState, useRef, useEffect } from "react";
import {
  Plus, X, Loader2, Pin, Volume2, VolumeX, Copy, Share2,
  RotateCw, BookMarked, Star, Link2, Camera,
  Moon, Settings as Cog, Eye, Sparkles, XCircle, Clock, Layers,
  ShieldOff, BookmarkPlus, Coffee, Zap, ArrowRightLeft, MoreHorizontal,
  PinOff, Square, Columns2, EyeOff, ChevronDown,
} from "lucide-react";
import NexusLogo from "./NexusLogo";
import { faviconFor } from "./useBrowser";
import { useSound } from "./Sound";
import TabHoverPreview from "./TabHoverPreview";
import TabActionMenu from "./TabActionMenu";

/**
 * TabBar — refined browser tab strip.
 *
 * Features:
 *  - Active tab with gradient underline + subtle elevation
 *  - Loading shimmer, favicon, pinned state, audible indicator (architecture)
 *  - Multi-select via Ctrl/Cmd+click; Shift+click range select
 *  - Right-click context menu via TabActionMenu
 *  - Hover preview after dwell
 *  - Compact new-tab button
 *
 * This component owns ONLY tab row rendering. Bulk operations are delegated
 * upward via onAction so the parent (which holds the tabs state) executes them.
 */
export default function TabBar({ tabs, activeId, onSelect, onClose, onNew, onAction, selectedIds, onToggleSelect, onClearSelection, onNewIncognito, privateOn }) {
  const [hoveredTab, setHoveredTab] = useState(null);
  const [menuTab, setMenuTab] = useState(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const { play } = useSound();
  const hoverTimer = useRef(null);
  const lastClickedId = useRef(null);
  const newMenuRef = useRef(null);

  // Close the new-tab split menu on outside click
  useEffect(() => {
    if (!newMenuOpen) return;
    const onDown = (e) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target)) setNewMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [newMenuOpen]);

  const showHover = (tab) => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoveredTab(tab), 600);
  };
  const hideHover = () => {
    clearTimeout(hoverTimer.current);
    setHoveredTab(null);
  };

  const openMenu = (tab, e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ x: rect.left, y: rect.bottom + 6 });
    setMenuTab(tab);
    play("click");
  };

  const handleTabClick = (e, tab) => {
    // Multi-select: Ctrl/Cmd toggles; Shift selects a range
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      onToggleSelect?.(tab.id);
      lastClickedId.current = tab.id;
      return;
    }
    if (e.shiftKey && lastClickedId.current && onToggleSelect) {
      e.preventDefault();
      const ids = tabs.map((t) => t.id);
      const from = ids.indexOf(lastClickedId.current);
      const to = ids.indexOf(tab.id);
      if (from !== -1 && to !== -1) {
        const [lo, hi] = from < to ? [from, to] : [to, from];
        for (let i = lo; i <= hi; i++) onToggleSelect(ids[i]);
      }
      return;
    }
    play("tabSwitch");
    onSelect(tab.id);
    lastClickedId.current = tab.id;
  };

  const hasSelection = selectedIds && selectedIds.length > 0;

  return (
    <>
      <div className="flex h-11 items-center gap-2 border-b border-border/40 bg-background px-3">
        <div className="flex flex-1 items-center gap-1 overflow-x-auto nexus-scroll">
          {tabs.map((tab, i) => {
            const isActive = tab.id === activeId;
            const isSelected = hasSelection && selectedIds.includes(tab.id);
            const fav = faviconFor(tab.url);
            const prev = tabs[i - 1];
            const showDivider = tab.incognito && (!prev || !prev.incognito);
            return (
              <React.Fragment key={tab.id}>
                {showDivider && (
                  <div className="mx-1 h-5 w-px shrink-0 bg-violet-500/30" title="Incognito tabs" />
                )}
                <div
                  onClick={(e) => handleTabClick(e, tab)}
                  onContextMenu={(e) => openMenu(tab, e)}
                  onMouseEnter={() => showHover(tab)}
                  onMouseLeave={hideHover}
                  className={`nx-tab-in group relative flex h-8 min-w-[150px] max-w-[210px] cursor-pointer items-center gap-2 rounded-t-lg border border-b-0 px-3 text-xs shrink-0 transition ${
                    isSelected
                      ? "border-accent/50 bg-accent/10 text-foreground nx-selected-ring"
                      : isActive
                      ? tab.incognito
                        ? "border-violet-500/40 bg-violet-500/10 text-foreground"
                        : "border-border/40 bg-card text-foreground"
                      : tab.incognito
                      ? "border-transparent text-violet-300/70 hover:bg-violet-500/10 hover:text-violet-200"
                      : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  {isActive && !isSelected && (
                    <span className={`absolute bottom-0 left-0 right-0 h-[2px] ${tab.incognito ? "bg-gradient-to-r from-violet-500 to-fuchsia-500" : "bg-gradient-to-r from-accent to-primary"}`} />
                  )}
                  {tab.incognito && !tab.pinned && (
                    <EyeOff className="h-3 w-3 shrink-0 text-violet-400/70" />
                  )}
                  {tab.pinned && <Pin className={`h-3 w-3 shrink-0 ${tab.incognito ? "text-violet-400/70" : "text-accent/60"}`} />}
                  {tab.loading ? (
                    <Loader2 className={`h-3.5 w-3.5 shrink-0 animate-spin ${tab.incognito ? "text-violet-400" : "text-accent"}`} />
                  ) : tab.url.startsWith("nexus://") ? (
                    <NexusLogo size={14} />
                  ) : fav ? (
                    <img src={fav} alt="" className="h-3.5 w-3.5 shrink-0 rounded-sm" />
                  ) : (
                    <NexusLogo size={14} />
                  )}
                  <span className="flex-1 truncate text-[13px]">{tab.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); play("tabClose"); onClose(tab.id); }}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground/60 opacity-0 hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100"
                    aria-label="Close tab"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => openMenu(tab, e)}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground/60 opacity-0 hover:text-accent group-hover:opacity-100"
                    aria-label="Tab actions"
                    title="Tab actions"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
              </React.Fragment>
            );
          })}
          <div className="relative flex shrink-0 items-center" ref={newMenuRef}>
            <button
              onClick={() => { play("tabOpen"); onNew(); }}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="New tab"
              title="New tab (Ctrl+T)"
            >
              <Plus className="h-4 w-4" />
            </button>
            {onNewIncognito && (
              <button
                onClick={() => setNewMenuOpen((o) => !o)}
                className="grid h-7 w-4 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="New tab options"
                title="New tab options"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            )}
            {newMenuOpen && onNewIncognito && (
              <div className="nx-reveal absolute right-0 top-9 z-50 w-56 overflow-hidden rounded-xl border border-border/40 bg-popover py-1.5 shadow-2xl">
                <button
                  onClick={() => { setNewMenuOpen(false); play("tabOpen"); onNew(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-muted-foreground transition hover:bg-accent/10 hover:text-accent"
                >
                  <Plus className="h-3.5 w-3.5" /> New Tab
                  <span className="ml-auto text-[10px] text-muted-foreground/50">Ctrl+T</span>
                </button>
                <button
                  onClick={() => { setNewMenuOpen(false); play("tabOpen"); onNewIncognito(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-muted-foreground transition hover:bg-violet-500/10 hover:text-violet-300"
                >
                  <EyeOff className="h-3.5 w-3.5" /> New Incognito Tab
                  <span className="ml-auto text-[10px] text-muted-foreground/50">Ctrl+Shift+N</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {hoveredTab && hoveredTab.id !== activeId && !hasSelection && (
        <TabHoverPreview tab={hoveredTab} onClose={hideHover} onSwitch={() => onSelect(hoveredTab.id)} />
      )}
      {menuTab && (
        <TabActionMenu
          tab={menuTab}
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuTab(null)}
          onAction={(action) => { onAction?.(action, menuTab); setMenuTab(null); }}
        />
      )}
    </>
  );
}