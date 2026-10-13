import React, { useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Search, Plus, X, RotateCw, Settings, Download, Star, Clock, Shield,
  Sparkles, Layers, FileText, Command as CommandIcon, Moon, Palette,
  Volume2, Trash2, Gauge, Eye, BookMarked, Briefcase, Save, History,
  Camera, Zap, ArrowLeft, ArrowRight, Home as HomeIcon,
  ChevronRight, Hash, Pin, PinOff, CornerDownLeft, Slash,
  Columns2, Rows2, Grid3x3, Grid2x2, Fingerprint, Lock, EyeOff,
} from "lucide-react";
import { faviconFor } from "./useBrowser";
import { useSound } from "./Sound";
import { LAYER, MOTION } from "./designSystem";

/* ------------------------------------------------------------------ */
/* Command catalog — grouped, described, keyworded, shortcuted          */
/* ------------------------------------------------------------------ */
const COMMANDS = [
  // Navigation
  { id: "go-settings",   label: "Open Settings",            icon: Settings,   action: "go", arg: "nexus://settings",    group: "Navigation", kws: "preferences config options" },
  { id: "go-downloads",  label: "Open Downloads",           icon: Download,   action: "go", arg: "nexus://downloads",   group: "Navigation", kws: "files saved" },
  { id: "go-bookmarks",  label: "Open Bookmarks",           icon: Star,       action: "go", arg: "nexus://bookmarks",   group: "Navigation", kws: "saved links favorites" },
  { id: "go-history",    label: "Open History",             icon: Clock,      action: "go", arg: "nexus://history",     group: "Navigation", kws: "visited pages past" },
  { id: "go-notes",      label: "Open Notes",               icon: FileText,   action: "go", arg: "nexus://notes",       group: "Navigation", kws: "write scratchpad" },
  { id: "go-tabs",       label: "Tab Manager",              icon: Layers,     action: "go", arg: "nexus://tabs",        group: "Navigation", kws: "all tabs overview" },
  { id: "go-privacy",    label: "Privacy Dashboard",        icon: Shield,     action: "go", arg: "nexus://privacy",     group: "Navigation", kws: "security trackers" },
  { id: "go-performance",label: "Performance Center",       icon: Gauge,      action: "go", arg: "nexus://performance", group: "Navigation", kws: "speed cpu memory" },
  { id: "go-workspaces", label: "Workspaces",               icon: Briefcase,  action: "go", arg: "nexus://workspaces",  group: "Navigation", kws: "profiles contexts" },
  { id: "go-sessions",   label: "Session Vault",            icon: Save,       action: "go", arg: "nexus://sessions",    group: "Navigation", kws: "snapshot restore" },
  { id: "go-readinglist",label: "Reading List",             icon: BookMarked, action: "go", arg: "nexus://readinglist", group: "Navigation", kws: "read later saved" },
  { id: "go-extensions", label: "Extensions",               icon: Zap,        action: "go", arg: "nexus://extensions",  group: "Navigation", kws: "addons plugins" },
  // Tab actions
  { id: "new-tab",       label: "New Tab",                  icon: Plus,       action: "newTab",    group: "Tabs", kws: "open create blank", shortcut: "Ctrl+T" },
  { id: "close-tab",     label: "Close Current Tab",        icon: X,          action: "closeTab",  group: "Tabs", kws: "remove exit" },
  { id: "reload",        label: "Reload Page",              icon: RotateCw,   action: "reload",    group: "Tabs", kws: "refresh", shortcut: "Ctrl+R" },
  { id: "duplicate-tab", label: "Duplicate Tab",            icon: Layers,     action: "duplicateTab", group: "Tabs", kws: "copy clone" },
  { id: "pin-tab",       label: "Pin / Unpin Tab",          icon: Pin,        action: "togglePin", group: "Tabs", kws: "fix keep" },
  // Browser actions
  { id: "go-back",       label: "Go Back",                  icon: ArrowLeft,  action: "goBack",    group: "Navigation", kws: "previous", shortcut: "Alt+←" },
  { id: "go-forward",    label: "Go Forward",               icon: ArrowRight, action: "goForward", group: "Navigation", kws: "next", shortcut: "Alt+→" },
  { id: "go-home",       label: "Go Home",                  icon: HomeIcon,   action: "goHome",    group: "Navigation", kws: "start page" },
  // Appearance
  { id: "toggle-dark",   label: "Toggle Force Dark",        icon: Moon,       action: "toggleForceDark", group: "Appearance", kws: "night dark mode" },
  { id: "cycle-theme",   label: "Cycle Theme",              icon: Palette,    action: "cycleTheme",    group: "Appearance", kws: "color skin" },
  { id: "performance-mode", label: "Performance Mode",      icon: Gauge,      action: "performanceMode", group: "System", kws: "speed reduce effects" },
  // Sessions
  { id: "save-session",  label: "Save Session Snapshot",    icon: Save,       action: "saveSession",   group: "Sessions", kws: "capture remember" },
  { id: "restore-session", label: "Restore Session",        icon: History,    action: "restoreSession", group: "Sessions", kws: "recover bring back" },
  // Audio
  { id: "toggle-sound",  label: "Mute / Unmute Sounds",     icon: Volume2,    action: "toggleSound", group: "Audio", kws: "quiet silent" },
  // Assistant
  { id: "open-assistant",label: "Open AI Assistant",        icon: Sparkles,   action: "assistant", group: "AI", kws: "chat help ask" },
  // Privacy
  { id: "clear-history", label: "Clear Browsing History",   icon: Trash2,     action: "clearHistory", group: "Privacy", kws: "delete wipe erase" },
  // Split View
  { id: "split-h",      label: "Split Left / Right",        icon: Columns2,   action: "splitH",     group: "Split View", kws: "pane side by side" },
  { id: "split-v",      label: "Split Top / Bottom",        icon: Rows2,      action: "splitV",     group: "Split View", kws: "pane stack" },
  { id: "split-grid",   label: "Split 2×2 Grid",            icon: Grid2x2,    action: "splitGrid",  group: "Split View", kws: "pane four quadrant" },
  // Spatial Canvas
  { id: "spatial",      label: "Spatial Canvas",            icon: Grid3x3,    action: "spatial",    group: "View", kws: "canvas arrange tabs spatial", shortcut: "Ctrl+Shift+C" },
  // Private Browsing
  { id: "enter-private", label: "Start Private Session",   icon: EyeOff,     action: "enterPrivate",  group: "Private", kws: "incognito private secure", shortcut: "Ctrl+Shift+N" },
  { id: "close-private", label: "Close Private Session",   icon: EyeOff,     action: "closePrivate",   group: "Private", kws: "exit end incognito clear" },
  // Privacy destinations
  { id: "go-shield",      label: "Nexus Shield",             icon: Shield,     action: "go", arg: "nexus://shield",       group: "Privacy", kws: "site protection trackers" },
  { id: "go-fingerprint", label: "Fingerprint Protection",  icon: Fingerprint, action: "go", arg: "nexus://fingerprint",  group: "Privacy", kws: "anti fingerprint surface" },
  { id: "go-permissions", label: "Permission Center",       icon: Lock,       action: "go", arg: "nexus://permissions",   group: "Privacy", kws: "camera mic location access" },
  { id: "go-transparency",label: "Nexus Transparency",      icon: Eye,        action: "go", arg: "nexus://transparency",  group: "Privacy", kws: "connections telemetry" },
  { id: "go-audit",       label: "Privacy & Security Audit",icon: Gauge,       action: "go", arg: "nexus://audit",         group: "Privacy", kws: "score check" },
  { id: "go-incognito",   label: "Private Browsing",        icon: EyeOff,     action: "go", arg: "nexus://incognito",     group: "Privacy", kws: "incognito mode" },
  // Capture (native-only)
  { id: "screenshot",    label: "Take Screenshot",          icon: Camera,     action: "screenshot",  group: "Capture", kws: "capture image", native: true },
];

/* ------------------------------------------------------------------ */
/* Aliases — quick shortcuts                                            */
/* ------------------------------------------------------------------ */
const ALIASES = {
  ":t": "nexus://tabs", ":s": "nexus://settings", ":h": "nexus://history",
  ":b": "nexus://bookmarks", ":d": "nexus://downloads", ":w": "nexus://workspaces",
  ":n": "nexus://notes", ":p": "nexus://privacy", ":r": "nexus://readinglist",
  ":v": "nexus://sessions", ":e": "nexus://extensions", ":g": "nexus://performance",
  "/tabs": "nexus://tabs", "/settings": "nexus://settings", "/search": "nexus://search",
  "/history": "nexus://history", "/bookmarks": "nexus://bookmarks", "/downloads": "nexus://downloads",
  "/workspace": "nexus://workspaces", "/privacy": "nexus://privacy", "/performance": "nexus://performance",
  "/notes": "nexus://notes", "/readinglist": "nexus://readinglist", "/sessions": "nexus://sessions",
};

/* ------------------------------------------------------------------ */
/* Fuzzy match — simple subsequence scoring                             */
/* ------------------------------------------------------------------ */
function fuzzyScore(term, text) {
  if (!term) return 1;
  const t = term.toLowerCase();
  const s = text.toLowerCase();
  let ti = 0, score = 0;
  for (let si = 0; si < s.length && ti < t.length; si++) {
    if (s[si] === t[ti]) { score += (si === 0 || s[si - 1] === " ") ? 3 : 1; ti++; }
  }
  return ti === t.length ? score / Math.max(1, s.length) : 0;
}

export default function CommandCenter({ open, onClose, onCommand, tabs }) {
  const [q, setQ] = useState("");
  const [bookmarks, setBookmarks] = useState([]);
  const [history, setHistory] = useState([]);
  const [index, setIndex] = useState(0);
  const [pinned, setPinned] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nexus_cmd_pinned") || "[]"); } catch { return []; }
  });
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nexus_cmd_recent") || "[]"); } catch { return []; }
  });
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const { play } = useSound();

  useEffect(() => {
    if (open) {
      setQ(""); setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
      base44.entities.Bookmark.list("-created_date", 40).then(setBookmarks).catch(() => {});
      base44.entities.HistoryEntry.list("-created_date", 30).then(setHistory).catch(() => {});
    }
  }, [open]);

  const trackRecent = (id) => {
    setRecent((prev) => {
      const next = [id, ...prev.filter((r) => r !== id)].slice(0, 6);
      localStorage.setItem("nexus_cmd_recent", JSON.stringify(next));
      return next;
    });
  };

  const togglePin = (id, e) => {
    e.stopPropagation();
    setPinned((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("nexus_cmd_pinned", JSON.stringify(next));
      return next;
    });
  };

  const aliasMatch = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return null;
    const entry = Object.entries(ALIASES).find(([k]) => k === term || k.startsWith(term));
    return entry ? { alias: entry[0], url: entry[1] } : null;
  }, [q]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (aliasMatch) return [];
    if (!term) {
      // Pinned first, then recent
      const pinnedCmds = COMMANDS.filter((c) => pinned.includes(c.id))
        .map((c) => ({ ...c, kind: "command" }));
      const recentCmds = COMMANDS.filter((c) => recent.includes(c.id) && !pinned.includes(c.id))
        .slice(0, 4)
        .map((c) => ({ ...c, kind: "command" }));
      return [...pinnedCmds, ...recentCmds];
    }
    const scored = COMMANDS
      .map((c) => ({ ...c, _score: fuzzyScore(term, `${c.label} ${c.group} ${c.kws || ""}`) }))
      .filter((c) => c._score > 0.04)
      .sort((a, b) => b._score - a._score)
      .slice(0, 8)
      .map((c) => ({ ...c, kind: "command" }));
    const tabRes = (tabs || [])
      .filter((t) => fuzzyScore(term, `${t.title} ${t.url}`) > 0.04)
      .slice(0, 5)
      .map((t) => ({ id: "tab-" + t.id, label: t.title, url: t.url, icon: Layers, kind: "tab", tabId: t.id }));
    const bm = bookmarks
      .filter((b) => fuzzyScore(term, `${b.title} ${b.url}`) > 0.04)
      .slice(0, 4)
      .map((b) => ({ id: "bm-" + b.id, label: b.title, url: b.url, icon: Star, kind: "bookmark" }));
    const hist = history
      .filter((h) => fuzzyScore(term, `${h.title} ${h.url}`) > 0.04)
      .slice(0, 4)
      .map((h) => ({ id: "hist-" + h.id, label: h.title, url: h.url, icon: Clock, kind: "history" }));
    return [...scored, ...tabRes, ...bm, ...hist].slice(0, 14);
  }, [q, tabs, bookmarks, history, aliasMatch, pinned, recent]);

  useEffect(() => { setIndex(0); }, [q]);
  useEffect(() => {
    const el = listRef.current?.children[index];
    el?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!open) return null;

  const runResult = (r) => {
    if (aliasMatch) {
      trackRecent(aliasMatch.alias);
      onCommand("go", aliasMatch.url);
      onClose(); return;
    }
    if (!r) return;
    if (r.native) { play("error"); return; }
    play("click");
    trackRecent(r.id || r.label);
    if (r.kind === "tab") onCommand("switchTab", r.tabId);
    else if (r.kind === "bookmark" || r.kind === "history") onCommand("go", r.url);
    else onCommand(r.action, r.arg);
    onClose();
  };

  const onKey = (e) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); runResult(results[index]); }
  };

  return (
    <div
      className="fixed inset-0 flex items-start justify-center bg-black/60 pt-[10vh] backdrop-blur-md"
      style={{ zIndex: LAYER.command }}
      onClick={onClose}
    >
      <div
        className="nx-reveal w-full max-w-xl overflow-hidden rounded-2xl border border-border/50 bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command Center"
      >
        <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
          <CommandIcon className="h-4 w-4 text-accent" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search commands, tabs, bookmarks… or type : or / for shortcuts"
            className="flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
            spellCheck={false}
            aria-label="Command search"
          />
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">esc</kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto nexus-scroll p-1.5">
          {aliasMatch && (
            <button onClick={runResult} className="flex w-full items-center gap-3 rounded-lg bg-accent/15 px-3 py-2.5 text-left">
              <Hash className="h-4 w-4 text-accent" />
              <span className="text-[13px] text-foreground">Go to <b>{aliasMatch.alias}</b></span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
            </button>
          )}
          {!aliasMatch && results.length === 0 && (
            <div className="px-4 py-10 text-center">
              <Search className="mx-auto h-6 w-6 text-muted-foreground/30" />
              <p className="mt-2 text-[13px] text-muted-foreground/60">No results for “{q}”</p>
              <p className="mt-1 text-[11px] text-muted-foreground/40">Try a command, tab title, or :shortcut</p>
            </div>
          )}
          {!aliasMatch && results.map((r, i) => (
            <div
              key={r.id || i}
              role="option"
              aria-selected={i === index}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer ${i === index ? "bg-accent/15" : "hover:bg-muted/50"}`}
              onClick={() => runResult(r)}
              onMouseEnter={() => setIndex(i)}
            >
              {r.url ? (
                <img src={faviconFor(r.url)} alt="" className="h-4 w-4 rounded-sm" onError={(e) => (e.currentTarget.style.display = "none")} />
              ) : (
                <r.icon className="h-4 w-4 text-accent" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-foreground">{r.label}</div>
                {r.group && <div className="text-[10px] text-muted-foreground/50">{r.group}</div>}
              </div>
              {r.native && <span className="rounded bg-amber-500/15 px-1 py-0.5 text-[8px] font-semibold text-amber-400">NATIVE</span>}
              {r.shortcut && (
                <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground">{r.shortcut}</kbd>
              )}
              {r.kind === "command" && (
                <button
                  onClick={(e) => togglePin(r.id, e)}
                  className="grid h-5 w-5 place-items-center rounded text-muted-foreground/50 hover:text-accent"
                  title={pinned.includes(r.id) ? "Unpin" : "Pin"}
                >
                  {pinned.includes(r.id) ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                </button>
              )}
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground/40">{r.kind}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t border-border/40 px-4 py-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><kbd className="rounded bg-muted px-1 py-0.5 font-mono">↑↓</kbd> Navigate</span>
          <span className="flex items-center gap-1"><kbd className="rounded bg-muted px-1 py-0.5 font-mono">⏎</kbd> Run</span>
          <span className="flex items-center gap-1"><Slash className="h-3 w-3" /> or <Hash className="h-3 w-3" /> shortcuts</span>
        </div>
      </div>
    </div>
  );
}