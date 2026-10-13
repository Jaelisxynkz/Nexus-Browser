import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Briefcase, Gamepad2, GraduationCap, Code, Search, Music, User } from "lucide-react";

const PRESETS = [
  { key: "personal", label: "Personal", icon: User },
  { key: "gaming", label: "Gaming", icon: Gamepad2 },
  { key: "school", label: "School", icon: GraduationCap },
  { key: "development", label: "Development", icon: Code },
  { key: "research", label: "Research", icon: Search },
  { key: "music", label: "Music", icon: Music },
];

export default function WorkspacesView() {
  const [workspaces, setWorkspaces] = useState([]);
  const [name, setName] = useState("");

  const load = useCallback(() => {
    base44.entities.Workspace.list("position", 100).then(setWorkspaces).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (preset) => {
    const label = preset ? preset.label : name.trim();
    if (!label) return;
    await base44.entities.Workspace.create({
      name: label, preset: preset?.key || "custom", position: workspaces.length, config: {},
    }).catch(() => {});
    setName("");
    load();
  };

  const remove = async (id) => {
    await base44.entities.Workspace.delete(id).catch(() => {});
    load();
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-white" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Workspaces</h1>
      <p className="mt-1 text-sm text-white/50">Separate contexts for tabs, shortcuts, and notes. Saved to your account.</p>

      <div className="mt-6 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create(null)}
          placeholder="Custom workspace name"
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#3b82f6]/60" />
        <button onClick={() => create(null)} className="rounded-xl bg-[#3b82f6] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#2f6fe0]">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.key} onClick={() => create(p)}
            className="flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3.5 py-1.5 text-[12px] text-white/60 hover:bg-white/[0.08] hover:text-white">
            <p.icon className="h-3.5 w-3.5" /> {p.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-2">
        {workspaces.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-white/30">
            <Briefcase className="h-8 w-8" />
            <span className="text-[13px]">No workspaces yet. Create one above.</span>
          </div>
        )}
        {workspaces.map((w) => (
          <div key={w.id} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#3b82f6]/15 text-[#60a5fa]">
              <Briefcase className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-white">{w.name}</div>
              <div className="text-[11px] text-white/35 capitalize">{w.preset || "custom"}</div>
            </div>
            <button onClick={() => remove(w.id)} className="rounded-lg p-2 text-white/40 hover:text-red-400">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}