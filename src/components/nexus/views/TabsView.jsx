import React, { useState, useMemo } from "react";
import {
  Search, X, Pin, PinOff, Volume2, VolumeX, Copy, Layers, RotateCw,
  Clock, ArrowRight, Star, BookMarked, Trash2, CheckSquare, Square,
  LayoutGrid, Globe2, Activity, Filter,
} from "lucide-react";
import NexusLogo from "../NexusLogo";
import { faviconFor } from "../useBrowser";
import { useSound } from "../Sound";
import { useToast } from "@/components/ui/use-toast";

export default function TabsView({ tabs, activeId, onSelect, onClose, onDuplicate, onTogglePin, onRestore, recentlyClosed }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const { play } = useSound();
  const { toast } = useToast();

  const filtered = useMemo(() => {
    let list = tabs;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((t) => (t.title + " " + t.url).toLowerCase().includes(q));
    }
    if (filter === "pinned") list = list.filter((t) => t.pinned);
    else if (filter === "unpinned") list = list.filter((t) => !t.pinned);
    else if (filter === "internal") list = list.filter((t) => t.url.startsWith("nexus://"));
    else if (filter === "external") list = list.filter((t) => !t.url.startsWith("nexus://"));
    return list;
  }, [tabs, query, filter]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((t) => {
      let domain = "Nexus";
      try { domain = new URL(t.url).hostname.replace(/^www\./, ""); } catch {}
      if (t.url.startsWith("nexus://")) domain = "Nexus Internal";
      if (!map.has(domain)) map.set(domain, []);
      map.get(domain).push(t);
    });
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const toggleSelect = (id) => {
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };
  const selectAll = () => setSelected(new Set(filtered.map((t) => t.id)));
  const deselectAll = () => setSelected(new Set());

  const closeSelected = () => {
    selected.forEach((id) => { if (id !== activeId) onClose(id); });
    setSelected(new Set());
    toast({ title: `Closed ${selected.size} tabs` });
  };

  const duplicates = useMemo(() => {
    const seen = new Map();
    tabs.forEach((t) => {
      if (seen.has(t.url)) (seen.get(t.url) || seen.set(t.url, [t])).get(t.url).push(t);
      else seen.set(t.url, [t]);
    });
    return [...seen.values()].filter((g) => g.length > 1).flat().length;
  }, [tabs]);

  const filters = [
    { id: "all", label: "All", count: tabs.length },
    { id: "pinned", label: "Pinned", count: tabs.filter((t) => t.pinned).length },
    { id: "internal", label: "Internal", count: tabs.filter((t) => t.url.startsWith("nexus://")).length },
    { id: "external", label: "External", count: tabs.filter((t) => !t.url.startsWith("nexus://")).length },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 text-accent">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground font-display">Tab Manager</h1>
            <p className="text-[12px] text-muted-foreground">{tabs.length} open · {selected.size} selected · {duplicates} duplicates</p>
          </div>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={closeSelected} className="flex items-center gap-1.5 rounded-lg bg-destructive/15 px-3 py-1.5 text-[11px] font-medium text-destructive hover:bg-destructive/25">
              <Trash2 className="h-3 w-3" /> Close {selected.size}
            </button>
            <button onClick={deselectAll} className="rounded-lg px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-muted">Deselect</button>
          </div>
        )}
      </div>

      <div className="mb-5 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border/40 bg-input/50 px-3.5 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tabs by title, URL, domain…" className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground" />
          {query && <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
        </div>
      </div>

      <div className="mb-5 flex gap-1.5">
        {filters.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition ${filter === f.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            {f.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${filter === f.id ? "bg-accent-foreground/20" : "bg-muted"}`}>{f.count}</span>
          </button>
        ))}
      </div>

      {grouped.map(([domain, groupTabs]) => (
        <div key={domain} className="mb-4">
          <div className="mb-1.5 flex items-center gap-2 px-1">
            <Globe2 className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{domain}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{groupTabs.length}</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-xl border border-border/30 bg-card/40 p-1.5">
            {groupTabs.map((tab) => {
              const isActive = tab.id === activeId;
              const isSelected = selected.has(tab.id);
              return (
                <div key={tab.id} onClick={() => { onSelect(tab.id); play("tabSwitch"); }} className={`group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition ${isActive ? "bg-accent/10" : "hover:bg-muted/50"} ${isSelected ? "bg-accent/5" : ""}`}>
                  <button onClick={(e) => { e.stopPropagation(); toggleSelect(tab.id); }} className="shrink-0 text-muted-foreground/50 hover:text-accent">
                    {isSelected ? <CheckSquare className="h-4 w-4 text-accent" /> : <Square className="h-4 w-4" />}
                  </button>
                  {tab.loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  ) : tab.url.startsWith("nexus://") ? (
                    <NexusLogo size={16} />
                  ) : (
                    <img src={faviconFor(tab.url)} alt="" className="h-4 w-4 rounded-sm" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-[13px] font-medium ${isActive ? "text-accent" : "text-foreground"}`}>{tab.title}</div>
                    <div className="truncate text-[10px] text-muted-foreground/60">{tab.url}</div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    {tab.pinned && <Pin className="h-3 w-3 text-accent/50" />}
                    <button onClick={(e) => { e.stopPropagation(); onTogglePin(tab.id); }} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-accent" title={tab.pinned ? "Unpin" : "Pin"}>
                      {tab.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDuplicate(tab.id); }} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-accent" title="Duplicate">
                      <Copy className="h-3 w-3" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onClose(tab.id); }} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-destructive" title="Close">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {recentlyClosed && recentlyClosed.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 flex items-center gap-2 px-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Recently Closed</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{recentlyClosed.length}</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-xl border border-border/30 bg-card/40 p-1.5">
            {recentlyClosed.slice(0, 6).map((tab) => (
              <div key={tab.id} className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50">
                <img src={faviconFor(tab.url)} alt="" className="h-4 w-4 rounded-sm" />
                <span className="flex-1 truncate text-[13px] text-muted-foreground">{tab.title}</span>
                <button onClick={() => onRestore(tab)} className="rounded-lg bg-accent/10 px-2.5 py-1 text-[11px] text-accent opacity-0 transition hover:bg-accent/20 group-hover:opacity-100">
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}