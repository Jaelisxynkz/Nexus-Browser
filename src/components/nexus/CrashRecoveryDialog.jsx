import React from "react";
import { AlertTriangle, RotateCw, Trash2, Stethoscope } from "lucide-react";
import { detectAbnormalShutdown } from "@/components/nexus/crashRecovery";
import { useToast } from "@/components/ui/use-toast";
import NexusLogo from "@/components/nexus/NexusLogo";

/**
 * CrashRecoveryDialog — shown on next launch after an abnormal shutdown.
 * Offers Restore previous session, Start clean, or open crash diagnostics.
 * Session state is preserved separately from app data; recovery never wipes
 * bookmarks/history/settings/workspaces.
 */
export default function CrashRecoveryDialog({ onRestore, onClean, onDiagnostics }) {
  const info = detectAbnormalShutdown();
  const { toast } = useToast();
  if (!info.crashed) return null;

  const restore = () => { toast({ title: "Restoring previous session" }); onRestore?.(); };
  const clean = () => { toast({ title: "Starting clean" }); onClean?.(); };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#05070d]/90 backdrop-blur-md">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-amber-500/30 bg-[#0a0e18] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-7 py-5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500/15">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-white">Nexus didn't close cleanly</div>
            <div className="text-[11.5px] text-white/45">
              {info.at ? `Last active: ${new Date(info.at).toLocaleString()}` : "We can restore your session safely."}
            </div>
          </div>
        </div>

        <div className="px-7 py-6">
          <p className="text-[13px] leading-relaxed text-white/60">
            Your bookmarks, history, settings, workspaces, and notes are untouched. Choose how to continue.
          </p>

          <div className="mt-5 space-y-2.5">
            <ActionRow
              icon={<RotateCw className="h-5 w-5 text-[#60a5fa]" />}
              title="Restore previous session"
              desc="Reopen your tabs and windows from before the crash."
              onClick={restore}
              primary
            />
            <ActionRow
              icon={<Trash2 className="h-5 w-5 text-white/60" />}
              title="Start clean"
              desc="Open a fresh tab. Your data stays intact."
              onClick={clean}
            />
            <ActionRow
              icon={<Stethoscope className="h-5 w-5 text-white/60" />}
              title="Open crash diagnostics"
              desc="Check system health, logs, and recovery options."
              onClick={onDiagnostics}
            />
          </div>

          <div className="mt-6 flex items-center gap-2 rounded-xl border border-[#3b82f6]/20 bg-[#3b82f6]/[0.06] px-4 py-3">
            <NexusLogo size={14} />
            <span className="text-[11px] text-white/55">
              Nexus keeps application files and user data separate, so recovery never puts your data at risk.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionRow({ icon, title, desc, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
        primary ? "border-[#3b82f6] bg-[#3b82f6]/[0.08] hover:bg-[#3b82f6]/15" : "border-white/[0.06] bg-white/[0.02] hover:border-white/20"
      }`}
    >
      <div className={`grid h-10 w-10 place-items-center rounded-lg ${primary ? "bg-[#3b82f6]/20" : "bg-white/[0.04]"}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-medium text-white">{title}</div>
        <div className="text-[11px] text-white/45">{desc}</div>
      </div>
    </button>
  );
}