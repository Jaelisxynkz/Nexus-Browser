import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, Star, Trash2, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function HistoryView({ onNavigate }) {
  const [entries, setEntries] = useState([]);
  const load = () => base44.entities.HistoryEntry.list("-created_date", 100).then(setEntries).catch(() => {});
  useEffect(() => { load(); }, []);

  const clearAll = async () => {
    for (const e of entries) await base44.entities.HistoryEntry.delete(e.id).catch(() => {});
    setEntries([]);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Clock className="h-5 w-5 text-[#60a5fa]" /> History
        </h2>
        {entries.length > 0 && (
          <button onClick={clearAll} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white/50 hover:bg-white/[0.06] hover:text-white">
            <Trash2 className="h-3.5 w-3.5" /> Clear all
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-white/40">No history yet.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {entries.map((e) => (
            <button
              key={e.id}
              onClick={() => onNavigate(e.url)}
              className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition hover:border-white/[0.06] hover:bg-white/[0.03]"
            >
              {e.favicon ? (
                <img src={e.favicon} alt="" className="h-4 w-4 rounded-sm" />
              ) : (
                <Clock className="h-4 w-4 text-white/30" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-white/85">{e.title}</div>
                <div className="truncate text-[11px] text-white/40">{e.url}</div>
              </div>
              <span className="shrink-0 text-[11px] text-white/35">
                {e.created_date ? formatDistanceToNow(new Date(e.created_date), { addSuffix: true }) : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BookmarksView({ onNavigate }) {
  const [items, setItems] = useState([]);
  const load = () => base44.entities.Bookmark.list("-created_date", 100).then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    await base44.entities.Bookmark.delete(id).catch(() => {});
    setItems((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white">
        <Star className="h-5 w-5 text-[#60a5fa]" /> Bookmarks
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-white/40">No bookmarks yet. Star any page to save it.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((b) => (
            <div
              key={b.id}
              className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition hover:border-[#3b82f6]/30"
            >
              <button onClick={() => onNavigate(b.url)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                {b.favicon ? (
                  <img src={b.favicon} alt="" className="h-5 w-5 rounded" />
                ) : (
                  <Star className="h-4 w-4 text-[#60a5fa]" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-[13px] text-white/85">{b.title}</div>
                  <div className="truncate text-[11px] text-white/40">{b.url}</div>
                </div>
              </button>
              <button onClick={() => remove(b.id)} className="text-white/30 opacity-0 hover:text-white group-hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}