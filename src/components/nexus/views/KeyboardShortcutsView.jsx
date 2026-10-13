import React, { useState, useMemo } from "react";
import { Keyboard, Search } from "lucide-react";

/**
 * Keyboard Shortcuts — discoverable cheat sheet + live filter.
 *
 * Curated list of every active shortcut in Nexus. Filterable so power users
 * can discover commands without memorizing them.
 */

const SHORTCUTS = [
  { group: "Tabs", keys: "Ctrl+T", desc: "New tab" },
  { group: "Tabs", keys: "Ctrl+W", desc: "Close tab" },
  { group: "Tabs", keys: "Ctrl+Tab", desc: "Next tab" },
  { group: "Tabs", keys: "Ctrl+Shift+Tab", desc: "Previous tab" },
  { group: "Tabs", keys: "Ctrl+Shift+T", desc: "Reopen closed tab" },
  { group: "Tabs", keys: "Ctrl+1..8", desc: "Jump to tab 1–8" },
  { group: "Tabs", keys: "Ctrl+9", desc: "Jump to last tab" },
  { group: "Tabs", keys: "Ctrl+click tab", desc: "Add to multi-select" },
  { group: "View", keys: "Ctrl+Shift+C", desc: "Spatial Canvas" },
  { group: "Side Panel", keys: "Ctrl+Shift+B", desc: "Toggle website dock" },
  { group: "Side Panel", keys: "Alt+S", desc: "Fast website switcher" },
  { group: "Navigation", keys: "Alt+←", desc: "Back" },
  { group: "Navigation", keys: "Alt+→", desc: "Forward" },
  { group: "Navigation", keys: "Ctrl+R", desc: "Reload" },
  { group: "Command Center", keys: "Ctrl+K", desc: "Open Command Center" },
  { group: "Command Center", keys: "/ or :", desc: "Shortcut aliases in palette" },
  { group: "Command Center", keys: "↑↓", desc: "Navigate results" },
  { group: "Command Center", keys: "Enter", desc: "Run selected" },
  { group: "Reading", keys: "Ctrl+Shift+R", desc: "Toggle Reader Mode" },
  { group: "Bookmarks", keys: "Ctrl+D", desc: "Bookmark current page" },
  { group: "Find", keys: "Ctrl+F", desc: "Find in page" },
  { group: "Settings", keys: "Ctrl+Shift+S", desc: "Quick Settings panel" },
];

export default function KeyboardShortcutsView() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.toLowerCase().trim();
    if (!t) return SHORTCUTS;
    return SHORTCUTS.filter((s) => (s.desc + " " + s.keys + " " + s.group).toLowerCase().includes(t));
  }, [q]);

  const groups = useMemo(() => {
    const m = {};
    filtered.forEach((s) => { if (!m[s.group]) m[s.group] = []; m[s.group].push(s); });
    return Object.entries(m);
  }, [filtered]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center gap-3 border-b border-border/40 pb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent">
          <Keyboard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-[20px] font-semibold text-foreground">Keyboard Shortcuts</h1>
          <p className="text-[13px] text-muted-foreground">Every active shortcut in Nexus. Some (Ctrl+T, Ctrl+W, Ctrl+Tab) are reserved by your web browser and work fully in the Nexus desktop app.</p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-lg border border-border/40 bg-input/40 px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter shortcuts…" className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground" />
      </div>

      <div className="mt-6 flex flex-col gap-5">
        {groups.map(([group, items]) => (
          <div key={group}>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{group}</div>
            <div className="overflow-hidden rounded-xl border border-border/40">
              {items.map((s, i) => (
                <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${i % 2 === 0 ? "bg-card/40" : "bg-card/20"}`}>
                  <span className="text-[13px] text-foreground">{s.desc}</span>
                  <kbd className="rounded bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">{s.keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="py-10 text-center text-[13px] text-muted-foreground/60">No shortcuts match “{q}”.</div>
        )}
      </div>
    </div>
  );
}