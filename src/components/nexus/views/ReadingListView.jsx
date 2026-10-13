import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { BookMarked, Eye, X, Search, Clock, Check } from "lucide-react";
import { useSound } from "../Sound";
import { useToast } from "@/components/ui/use-toast";
import { faviconFor } from "../useBrowser";

/**
 * ReadingListView — full-page reading list backed by the Bookmark entity.
 * Bookmarks tagged "readinglist" are saved-for-later items; "read" marks them read.
 */
export default function ReadingListView({ onNavigate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("unread");
  const [query, setQuery] = useState("");
  const { play } = useSound();
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    base44.entities.Bookmark.filter({ tags: { $in: ["readinglist", "read"] } }, "-created_date", 200)
      .then((r) => { setItems(r); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    await base44.entities.Bookmark.delete(id).catch(() => {});
    setItems((prev) => prev.filter((b) => b.id !== id));
    play("click");
    toast({ title: "Removed" });
  };

  const markRead = async (item, read = true) => {
    await base44.entities.Bookmark.update(item.id, { tags: [read ? "read" : "readinglist"] }).catch(() => {});
    setItems((prev) => prev.map((b) => (b.id === item.id ? { ...b, tags: [read ? "read" : "readinglist"] } : b)));
    play("toggleOn");
  };

  const filtered = useMemo(() => {
    let list = items;
    if (filter === "unread") list = items.filter((i) => !i.tags?.includes("read"));
    else if (filter === "read") list = items.filter((i) => i.tags?.includes("read"));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((i) => (i.title + " " + i.url).toLowerCase().includes(q));
    }
    return list;
  }, [items, filter, query]);

  const unreadCount = items.filter((i) => !i.tags?.includes("read")).length;

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-accent/20 text-accent">
            <BookMarked className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">Reading List</h1>
            <p className="text-[13px] text-muted-foreground">{unreadCount} unread · {items.length} total saved</p>
          </div>
        </div>
      </header>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-border/40 bg-input/50 px-3.5 py-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your reading list…"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border/40 bg-card p-1">
          {[
            { id: "unread", label: "Unread" },
            { id: "read", label: "Read" },
            { id: "all", label: "All" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1 text-[12px] transition ${
                filter === f.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/10 hover:text-accent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[13px] text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <BookMarked className="h-12 w-12 text-muted-foreground/30" />
          <h3 className="text-[15px] font-medium text-foreground">
            {filter === "unread" ? "No unread articles" : filter === "read" ? "Nothing read yet" : "Your reading list is empty"}
          </h3>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            Save pages to read later by clicking the bookmark icon in the address bar and choosing "Save to Reading List."
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((item) => {
            const isRead = item.tags?.includes("read");
            return (
              <div
                key={item.id}
                className={`group flex items-center gap-3 rounded-xl border border-border/30 bg-card/40 p-4 transition hover:border-accent/40 hover:bg-card/70 ${
                  isRead ? "opacity-60" : ""
                }`}
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-border/40 bg-muted">
                  {item.favicon ? <img src={item.favicon} alt="" className="h-6 w-6" /> : <BookMarked className="h-5 w-5 text-accent" />}
                </div>
                <button onClick={() => onNavigate(item.url)} className="min-w-0 flex-1 text-left">
                  <div className={`truncate text-[14px] font-medium ${isRead ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {item.title || item.url}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground/70">
                    <Clock className="h-3 w-3" />
                    {(() => { try { return new URL(item.url).hostname.replace(/^www\./, ""); } catch { return item.url; } })()}
                  </div>
                </button>
                <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  {!isRead ? (
                    <button onClick={() => markRead(item, true)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent/10 hover:text-accent" title="Mark as read">
                      <Check className="h-4 w-4" />
                    </button>
                  ) : (
                    <button onClick={() => markRead(item, false)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent/10 hover:text-accent" title="Mark as unread">
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => remove(item.id)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/20 hover:text-destructive" title="Remove">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}