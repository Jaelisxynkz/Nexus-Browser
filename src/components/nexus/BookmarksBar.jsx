import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Star, X } from "lucide-react";

export default function BookmarksBar({ onNavigate, refreshKey }) {
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    base44.entities.Bookmark.filter({ pinned: true }, "-created_date", 30)
      .then(setBookmarks)
      .catch(() => setBookmarks([]));
  }, [refreshKey]);

  const remove = async (id) => {
    await base44.entities.Bookmark.delete(id).catch(() => {});
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="flex h-9 items-center gap-1 overflow-x-auto border-b border-border/40 bg-background px-4 nexus-scroll">
      {bookmarks.length === 0 ? (
        <button className="flex items-center gap-2 text-[11px] text-muted-foreground/70 hover:text-foreground">
          <Star className="h-3 w-3" />
          Star a bookmark to pin it here
        </button>
      ) : (
        bookmarks.map((b) => (
          <div
            key={b.id}
            className="group flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <button onClick={() => onNavigate(b.url)} className="flex items-center gap-1.5">
              {b.favicon ? (
                <img src={b.favicon} alt="" className="h-3.5 w-3.5 rounded-sm" />
              ) : (
                <Star className="h-3 w-3 text-accent" />
              )}
              <span className="max-w-[140px] truncate">{b.title}</span>
            </button>
            <button
              onClick={() => remove(b.id)}
              className="ml-0.5 hidden text-muted-foreground/60 hover:text-destructive group-hover:block"
              aria-label="Remove bookmark"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))
      )}
      <div className="ml-auto flex items-center gap-1 pl-2">
        <button className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground">
          Manage
        </button>
      </div>
    </div>
  );
}