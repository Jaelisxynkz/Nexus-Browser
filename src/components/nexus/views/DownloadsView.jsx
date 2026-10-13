import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Download, Trash2, Loader2 } from "lucide-react";

// Downloads — records-backed list. Real downloads require the native runtime,
// so this shows the Download entity state (no fabricated progress).
export default function DownloadsView() {
  const [items, setItems] = useState(null);

  const load = useCallback(() => {
    base44.entities.Download.list("-created_date", 100).then(setItems).catch(() => setItems([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    await base44.entities.Download.delete(id).catch(() => {});
    load();
  };

  const statusColor = {
    active: "text-[#60a5fa]", completed: "text-emerald-400", failed: "text-red-400",
    paused: "text-amber-400", cancelled: "text-white/40",
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center gap-3">
        <Download className="h-7 w-7 text-[#60a5fa]" />
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Downloads</h1>
      </div>
      <p className="mt-1 text-sm text-white/50">File downloads are handled by the native Nexus runtime. Records appear here when present.</p>

      <div className="mt-6">
        {items === null ? (
          <div className="flex items-center gap-2 py-8 text-white/40"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/[0.1] py-14 text-white/30">
            <Download className="h-8 w-8" />
            <span className="text-[13px]">No downloads. Native download handling isn't available in this web runtime.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <Download className="h-4 w-4 shrink-0 text-[#60a5fa]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-white">{d.filename}</div>
                  <div className="truncate text-[11px] text-white/35">{d.url}</div>
                </div>
                <span className={`text-[11px] capitalize ${statusColor[d.status] || "text-white/40"}`}>{d.status}</span>
                <button onClick={() => remove(d.id)} className="rounded p-1.5 text-white/40 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}