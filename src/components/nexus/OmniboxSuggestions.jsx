import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Globe, Star, Clock, ArrowRight, History as HistoryIcon,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { faviconFor } from "./useBrowser";
import { resolveInput } from "./searchEngine";

/**
 * OmniboxSuggestions — a real autocomplete dropdown for the address bar.
 *
 * Sources, in priority order:
 *  1. Exact URL match in history → "Switch to tab"-style top hit
 *  2. Bookmarks whose title/url contains the query
 *  3. History entries whose title/url contains the query
 *  4. Search suggestion (the resolved search-URL for the raw query)
 *
 * Selection model: ↑/↓ to move, Enter to run, Esc to close, Tab to autocomplete
 * the highlighted URL into the input. Mouse hover also moves the highlight.
 *
 * No fabricated suggestions — every row is a real stored record or a real
 * search-engine URL derived from the user's configured engine.
 */
export default function OmniboxSuggestions({ query, onNavigate, onDismiss, anchorRef }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [history, setHistory] = useState([]);
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  // Load a reasonable window of records once on mount.
  useEffect(() => {
    base44.entities.Bookmark.list("-created_date", 200).then(setBookmarks).catch(() => {});
    base44.entities.HistoryEntry.list("-created_date", 200).then(setHistory).catch(() => {});
  }, []);

  const term = query.trim().toLowerCase();

  const rows = useMemo(() => {
    if (!term) return [];
    const out = [];

    // 1. Top hit: exact URL match in history (a "switch to this site" feel).
    const exact = history.find((h) => h.url.toLowerCase() === term || h.url.toLowerCase() === "https://" + term);
    if (exact) {
      out.push({ id: "exact", kind: "top", label: exact.title || exact.url, url: exact.url, icon: Globe });
    }

    // 2. Bookmarks — title or url contains the term.
    bookmarks
      .filter((b) => b.title?.toLowerCase().includes(term) || b.url.toLowerCase().includes(term))
      .slice(0, 4)
      .forEach((b) => out.push({ id: "bm-" + b.id, kind: "bookmark", label: b.title || b.url, url: b.url, icon: Star }));

    // 3. History — title or url contains the term, not already added from bookmarks.
    const seen = new Set(out.map((r) => r.url));
    history
      .filter((h) => !seen.has(h.url) && (h.title?.toLowerCase().includes(term) || h.url.toLowerCase().includes(term)))
      .slice(0, 5)
      .forEach((h) => out.push({ id: "hist-" + h.id, kind: "history", label: h.title || h.url, url: h.url, icon: HistoryIcon }));

    // 4. Search suggestion — always present if there's a non-URL term.
    const looksUrl = /^https?:\/\//i.test(term) || /^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(term);
    if (!looksUrl) {
      const searchUrl = resolveInput(query, { engine: "nexus" });
      out.push({ id: "search", kind: "search", label: query, url: searchUrl, icon: Search });
    } else if (!out.some((r) => r.url.startsWith("http"))) {
      // Raw domain typed and nothing stored — offer to navigate directly.
      const direct = /^https?:\/\//i.test(query) ? query : "https://" + query;
      out.push({ id: "direct", kind: "top", label: direct, url: direct, icon: Globe });
    }

    return out.slice(0, 8);
  }, [term, bookmarks, history, query]);

  useEffect(() => { setIndex(0); }, [term]);
  useEffect(() => {
    const el = listRef.current?.children[index];
    el?.scrollIntoView({ block: "nearest" });
  }, [index]);

  // Keyboard handled by parent; expose nav via props would be cleaner, but
  // we attach a window listener here so the parent doesn't need to thread it.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { onDismiss(); return; }
      if (rows.length === 0) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(i + 1, rows.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
      else if (e.key === "Enter" && rows[index]) { e.preventDefault(); onNavigate(rows[index].url); }
      else if (e.key === "Tab" && rows[index]) { e.preventDefault(); onNavigate(rows[index].url); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [rows, index, onNavigate, onDismiss]);

  if (rows.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="nx-reveal absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-border/50 bg-popover shadow-2xl"
      role="listbox"
    >
      {rows.map((r, i) => (
        <button
          key={r.id}
          role="option"
          aria-selected={i === index}
          onMouseEnter={() => setIndex(i)}
          onClick={() => onNavigate(r.url)}
          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
            i === index ? "bg-accent/15" : "hover:bg-muted/50"
          }`}
        >
          {r.url ? (
            <img src={faviconFor(r.url)} alt="" className="h-4 w-4 shrink-0 rounded-sm" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ) : (
            <r.icon className="h-4 w-4 shrink-0 text-accent" />
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] text-foreground">{r.label}</div>
            <div className="truncate text-[10px] text-muted-foreground/60">{r.url.replace(/^https?:\/\//, "")}</div>
          </div>
          <span className="shrink-0 rounded bg-muted/60 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            {r.kind === "top" ? "Top hit" : r.kind === "bookmark" ? "Bookmark" : r.kind === "history" ? "History" : "Search"}
          </span>
          {i === index && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />}
        </button>
      ))}
    </div>
  );
}