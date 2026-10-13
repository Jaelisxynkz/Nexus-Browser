import React, { useState } from "react";
import { Briefcase, ChevronDown, Plus, Check } from "lucide-react";
import { useSound } from "./Sound";

/**
 * WorkspaceSwitcher — a compact chrome control that shows the active workspace
 * and lets the user switch, create, or go to the full workspaces page.
 *
 * Lives at the far-left of the NavBar. Workspaces are stored in the Workspace
 * entity; this component reads them live so the count and active preset are
 * always accurate.
 */
import { base44 } from "@/api/base44Client";
import { useEffect } from "react";

const PRESET_META = {
  personal: { color: "#60a5fa", icon: "👤" },
  gaming: { color: "#a855f7", icon: "🎮" },
  research: { color: "#22d3ee", icon: "🔬" },
  development: { color: "#34d399", icon: "💻" },
  media: { color: "#f472b6", icon: "🎬" },
  work: { color: "#fbbf24", icon: "💼" },
  school: { color: "#94a3b8", icon: "📚" },
};

export default function WorkspaceSwitcher({ onOpenWorkspaces, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const { play } = useSound();

  useEffect(() => {
    base44.entities.Workspace.list("position", 20)
      .then((r) => {
        setWorkspaces(r);
        if (r.length && !activeId) setActiveId(r[0].id);
      })
      .catch(() => {});
  }, []);

  const active = workspaces.find((w) => w.id === activeId);
  const meta = active ? PRESET_META[active.preset] || PRESET_META.personal : PRESET_META.personal;

  const select = (id) => {
    setActiveId(id);
    setOpen(false);
    play("click");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-2 rounded-full border border-border/40 bg-muted/40 pl-2 pr-2.5 text-[12px] text-foreground transition hover:border-accent/40 hover:bg-muted"
        aria-label="Switch workspace"
        title="Workspaces"
      >
        <span
          className="grid h-5 w-5 place-items-center rounded-full text-[10px]"
          style={{ background: `${meta.color}22`, color: meta.color }}
        >
          {meta.icon}
        </span>
        <span className="max-w-[100px] truncate font-medium">
          {active ? active.name : "Personal"}
        </span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="nx-reveal absolute left-0 top-10 z-50 w-64 overflow-hidden rounded-xl border border-border/50 bg-popover shadow-2xl">
            <div className="border-b border-border/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Workspaces
            </div>
            <div className="max-h-64 overflow-y-auto nexus-scroll p-1.5">
              {workspaces.length === 0 ? (
                <div className="px-3 py-6 text-center text-[12px] text-muted-foreground/60">
                  No workspaces yet.
                </div>
              ) : (
                workspaces.map((w) => {
                  const m = PRESET_META[w.preset] || PRESET_META.personal;
                  return (
                    <button
                      key={w.id}
                      onClick={() => select(w.id)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition hover:bg-accent/10"
                    >
                      <span
                        className="grid h-6 w-6 place-items-center rounded-md text-[11px]"
                        style={{ background: `${m.color}22`, color: m.color }}
                      >
                        {m.icon}
                      </span>
                      <span className="flex-1 truncate">{w.name}</span>
                      {w.id === activeId && <Check className="h-3.5 w-3.5 text-accent" />}
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t border-border/30 p-1.5">
              <button
                onClick={() => { setOpen(false); onNavigate?.("nexus://workspaces"); }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] text-muted-foreground transition hover:bg-accent/10 hover:text-accent"
              >
                <Briefcase className="h-3.5 w-3.5" /> Manage workspaces
              </button>
              <button
                onClick={() => { setOpen(false); onNavigate?.("nexus://workspaces"); }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] text-muted-foreground transition hover:bg-accent/10 hover:text-accent"
              >
                <Plus className="h-3.5 w-3.5" /> New workspace
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}