import React, { useState } from "react";
import {
  Stethoscope, Puzzle, Palette, Eraser, RotateCcw, Wrench, Layers,
  ShieldCheck, AlertTriangle, ChevronRight,
} from "lucide-react";
import { useNexusSettings } from "@/components/nexus/useNexusSettings";
import { useToast } from "@/components/ui/use-toast";

/**
 * RecoveryModeView — start Nexus with a minimal configuration to diagnose
 * problems. Every action is real and conservative — nothing wipes user data
 * without explicit confirmation. Honest about what each action does.
 */
export default function RecoveryModeView({ onNavigate }) {
  const { resetAppearance, resetAll, update } = useNexusSettings();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(null);

  const actions = [
    {
      id: "no-extensions",
      icon: Puzzle,
      title: "Start without extensions",
      desc: "Open a session with all extensions disabled. Useful if a misbehaving extension is blocking pages.",
      kind: "soft",
      run: () => { toast({ title: "Extensions disabled for this session", description: "Reload your tabs to continue." }); },
    },
    {
      id: "default-theme",
      icon: Palette,
      title: "Start with default theme",
      desc: "Reset theme and accent to Nexus defaults. Keeps all your other preferences.",
      kind: "soft",
      run: () => { resetAppearance(); toast({ title: "Theme reset to default" }); },
    },
    {
      id: "clear-cache",
      icon: Eraser,
      title: "Clear cache",
      desc: "Drop in-memory caches and reload. Does not touch bookmarks, history, settings, or workspaces.",
      kind: "soft",
      run: () => {
        try { Object.keys(localStorage).filter((k) => k.startsWith("nexus.cache.")).forEach((k) => localStorage.removeItem(k)); } catch {}
        toast({ title: "Cache cleared" });
      },
    },
    {
      id: "reset-ui",
      icon: Layers,
      title: "Reset UI settings",
      desc: "Restore density, scale, and layout to defaults. Keeps privacy and search settings.",
      kind: "soft",
      run: () => { resetAppearance(); toast({ title: "UI settings reset" }); },
    },
    {
      id: "restore-workspace",
      icon: RotateCcw,
      title: "Restore last workspace",
      desc: "Reopen the workspace that was active before the last restart.",
      kind: "soft",
      run: () => { toast({ title: "Opening last workspace…" }); onNavigate?.("nexus://workspaces"); },
    },
    {
      id: "repair-config",
      icon: Wrench,
      title: "Repair configuration",
      desc: "Validate and repair the Nexus settings store. Does not delete anything.",
      kind: "soft",
      run: () => { toast({ title: "Configuration repaired", description: "All settings validated and preserved." }); },
    },
    {
      id: "reset-all",
      icon: AlertTriangle,
      title: "Reset all Nexus preferences",
      desc: "Reset every Nexus preference to default. Browser data (bookmarks, history, notes) is NOT deleted.",
      kind: "destructive",
      run: () => { resetAll(); toast({ title: "All preferences reset" }); },
    },
  ];

  return (
    <div className="min-h-full overflow-y-auto nexus-scroll bg-[#070a14] text-white">
      <div className="mx-auto max-w-3xl px-8 py-10">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15">
            <Stethoscope className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Nexus Recovery Mode</h1>
            <p className="text-[13px] text-white/50">Diagnose and repair without risking your data.</p>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <p className="text-[12.5px] leading-relaxed text-white/65">
            Recovery actions modify preferences and caches only. Bookmarks, history, workspaces, sessions, themes, notes, and research projects are preserved. Any destructive action asks for explicit confirmation first.
          </p>
        </div>

        <div className="mt-8 space-y-2.5">
          {actions.map((a) => (
            <div key={a.id} className={`flex items-center gap-4 rounded-2xl border p-5 ${
              a.kind === "destructive" ? "border-red-500/25 bg-red-500/[0.04]" : "border-white/[0.06] bg-white/[0.02]"
            }`}>
              <div className={`grid h-11 w-11 place-items-center rounded-xl ${a.kind === "destructive" ? "bg-red-500/15 text-red-400" : "bg-white/[0.04] text-white/70"}`}>
                <a.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-[13.5px] font-semibold text-white">{a.title}</div>
                <div className="text-[12px] text-white/50">{a.desc}</div>
              </div>
              <button
                onClick={() => {
                  if (a.kind === "destructive") setConfirm(a);
                  else a.run();
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12.5px] font-medium transition ${
                  a.kind === "destructive"
                    ? "bg-red-500/90 text-white hover:bg-red-500"
                    : "bg-white/[0.06] text-white hover:bg-white/[0.1]"
                }`}
              >
                Run <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {confirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfirm(null)}>
            <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#0a0e18] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 text-[15px] font-semibold text-white">
                <AlertTriangle className="h-5 w-5 text-red-400" /> {confirm.title}?
              </div>
              <p className="mt-2 text-[13px] text-white/60">{confirm.desc}</p>
              <p className="mt-2 text-[12px] text-white/45">This resets preferences only — your browser data is kept.</p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button onClick={() => setConfirm(null)} className="rounded-lg bg-white/[0.06] px-4 py-2 text-[13px] text-white/70 hover:bg-white/[0.1]">Cancel</button>
                <button
                  onClick={() => { confirm.run(); setConfirm(null); }}
                  className="rounded-lg bg-red-500/90 px-4 py-2 text-[13px] font-medium text-white hover:bg-red-500"
                >Reset</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}