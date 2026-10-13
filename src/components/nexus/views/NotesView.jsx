import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Pin, Trash2, FileText } from "lucide-react";

export default function NotesView() {
  const [notes, setNotes] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    base44.entities.Note.list("-updated_date", 100).then(setNotes).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = notes.find((n) => n.id === activeId) || null;

  const create = async () => {
    const n = await base44.entities.Note.create({ title: "Untitled", body: "" }).catch(() => null);
    if (n) { load(); setActiveId(n.id); }
  };

  const patch = async (id, changes) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...changes } : n)));
    setSaving(true);
    await base44.entities.Note.update(id, changes).catch(() => {});
    setSaving(false);
  };

  const remove = async (id) => {
    await base44.entities.Note.delete(id).catch(() => {});
    if (activeId === id) setActiveId(null);
    load();
  };

  const togglePin = (n) => patch(n.id, { pinned: !n.pinned });

  const filtered = notes.filter((n) =>
    (n.title + " " + (n.body || "")).toLowerCase().includes(search.toLowerCase())
  );
  const pinned = filtered.filter((n) => n.pinned);
  const rest = filtered.filter((n) => !n.pinned);

  return (
    <div className="flex h-full">
      <div className="flex w-72 flex-col border-r border-white/[0.06]">
        <div className="flex items-center gap-2 border-b border-white/[0.06] p-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2">
            <Search className="h-4 w-4 text-white/40" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes"
              className="flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/30" />
          </div>
          <button onClick={create} className="rounded-lg bg-[#3b82f6]/20 p-2 text-[#60a5fa] hover:bg-[#3b82f6]/30">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto nexus-scroll p-2">
          {[...pinned, ...rest].map((n) => (
            <button key={n.id} onClick={() => setActiveId(n.id)}
              className={`mb-1 block w-full rounded-lg px-3 py-2.5 text-left transition ${
                activeId === n.id ? "bg-[#3b82f6]/15" : "hover:bg-white/[0.04]"
              }`}>
              <div className="flex items-center gap-2">
                {n.pinned && <Pin className="h-3 w-3 shrink-0 text-[#60a5fa]" />}
                <span className="truncate text-[13px] font-medium text-white">{n.title || "Untitled"}</span>
              </div>
              <div className="mt-0.5 line-clamp-1 text-[11px] text-white/40">{(n.body || "").replace(/[#*`]/g, "").slice(0, 60)}</div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-white/30">
              <FileText className="h-8 w-8" />
              <span className="text-[12px]">No notes yet</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {active ? (
          <>
            <div className="flex items-center gap-2 border-b border-white/[0.06] p-3">
              <input value={active.title} onChange={(e) => patch(active.id, { title: e.target.value })}
                className="flex-1 bg-transparent text-lg font-semibold text-white outline-none" placeholder="Note title" />
              {saving && <span className="text-[11px] text-white/40">Saving…</span>}
              <button onClick={() => togglePin(active)} className={`rounded-lg p-2 ${active.pinned ? "text-[#60a5fa]" : "text-white/40 hover:text-white"}`}>
                <Pin className="h-4 w-4" />
              </button>
              <button onClick={() => remove(active.id)} className="rounded-lg p-2 text-white/40 hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={active.body || ""}
              onChange={(e) => patch(active.id, { body: e.target.value })}
              placeholder="Write in Markdown…"
              className="flex-1 resize-none bg-transparent p-5 font-mono text-[13px] leading-relaxed text-white/90 outline-none placeholder:text-white/25"
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-white/30">
            <FileText className="h-12 w-12" />
            <p className="text-sm">Select a note or create a new one</p>
            <button onClick={create} className="rounded-lg bg-[#3b82f6]/20 px-4 py-2 text-[13px] text-[#60a5fa] hover:bg-[#3b82f6]/30">
              New Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}