import React, { useEffect, useState, useMemo } from "react";
import {
  ShieldCheck, Download, RefreshCw, Clock, ChevronRight, CheckCircle2,
  AlertTriangle, Loader2, History, Tag, FileText, ExternalLink,
} from "lucide-react";
import { getUpdateManager, UPDATE_STATUS, RELEASE_CHANNELS } from "@/components/nexus/updateManager";
import { NEXUS_RELEASE, formatVersion } from "@/components/nexus/release";
import { getCapabilities } from "@/components/nexus/desktopRuntime";
import { useToast } from "@/components/ui/use-toast";
import NexusLogo from "@/components/nexus/NexusLogo";

export default function UpdateCenter({ onNavigate }) {
  const [manager] = useState(getUpdateManager);
  const [state, setState] = useState(manager.getState());
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const { toast } = useToast();
  const caps = useMemo(() => getCapabilities(), []);

  useEffect(() => manager.subscribe(setState), [manager]);

  const doCheck = async () => {
    setChecking(true);
    const r = await manager.checkForUpdates({ userInitiated: true });
    setChecking(false);
    if (r.ok && r.source === "manifest" && r.updateAvailable) {
      toast({ title: "Update available", description: `Nexus ${r.info.version} is ready.` });
    } else if (r.ok && !r.updateAvailable && r.source !== undefined) {
      toast({ title: "You're up to date" });
    } else if (r.reason === "no-release-source") {
      toast({ title: "Update service not connected", description: "Release channel not configured for this build." });
    }
  };

  const doApply = async () => {
    setApplying(true);
    const r = await manager.applyUpdate();
    setApplying(false);
    if (r.ok && r.mode === "installer") {
      toast({ title: "Opening the Nexus installer", description: "Download it, then run NexusSetup to update." });
      if (r.downloadUrl) window.open(r.downloadUrl, "_blank", "noopener,noreferrer");
    } else if (r.ok && r.mode === "native") {
      toast({ title: "Installing update", description: "Nexus will restart when ready." });
    } else {
      toast({ title: "No update ready to install", variant: "destructive" });
    }
  };

  const statusMeta = useMemo(() => statusToMeta(state.status), [state.status]);

  return (
    <div className="min-h-full overflow-y-auto nexus-scroll bg-[#070a14] text-white">
      <div className="mx-auto max-w-3xl px-8 py-10">
        {/* Hero */}
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#1e3a8a] shadow-[0_0_24px_rgba(59,130,246,0.35)]">
            <NexusLogo size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Nexus Update Center</h1>
            <p className="text-[13px] text-white/50">Keep Nexus current, secure, and reliable.</p>
          </div>
        </div>

        {/* Status banner */}
        <div className={`mt-8 overflow-hidden rounded-2xl border ${statusMeta.border} ${statusMeta.bg} p-6`}>
          <div className="flex items-start gap-4">
            <div className={`grid h-12 w-12 place-items-center rounded-xl ${statusMeta.iconBg}`}>
              {statusMeta.icon}
            </div>
            <div className="flex-1">
              <div className="text-[16px] font-semibold">{statusMeta.title}</div>
              <div className="mt-0.5 text-[13px] text-white/60">{statusMeta.subtitle}</div>

              {/* Native install progress (desktop only, real events) */}
              {(state.status === UPDATE_STATUS.DOWNLOADING || state.status === UPDATE_STATUS.VERIFYING) && (
                <div className="mt-4">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#60a5fa] transition-all" style={{ width: `${state.progress}%` }} />
                  </div>
                  <div className="mt-1 text-[11px] text-white/45">{state.status === UPDATE_STATUS.VERIFYING ? "Verifying update…" : `${state.progress}% downloaded`}</div>
                </div>
              )}

              {state.error && (
                <div className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-200">
                  {state.error}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={doCheck}
                  disabled={checking || applying}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-white/[0.1] disabled:opacity-50"
                >
                  {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Check for updates
                </button>

                {(state.status === UPDATE_STATUS.AVAILABLE || state.status === UPDATE_STATUS.READY) && (
                  <button
                    onClick={doApply}
                    disabled={applying}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#3b82f6] px-4 py-2 text-[13px] font-medium text-white shadow-[0_0_16px_rgba(59,130,246,0.4)] transition hover:bg-[#2563eb] disabled:opacity-50"
                  >
                    {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {state.status === UPDATE_STATUS.READY ? "Restart to update" : "Update now"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Version + channel grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <InfoCard title="Installed version" icon={<Tag className="h-4 w-4 text-[#60a5fa]" />}>
            <div className="text-[15px] font-semibold">{formatVersion(state.installedVersion, state.installedBuild)}</div>
            <div className="text-[11px] text-white/45">codename "{NEXUS_RELEASE.codename}" · build {state.installedBuild}</div>
          </InfoCard>
          <InfoCard title="Latest available" icon={<Clock className="h-4 w-4 text-[#60a5fa]" />}>
            {state.latest ? (
              <>
                <div className="text-[15px] font-semibold">{formatVersion(state.latest.version, state.latest.build)}</div>
                <div className="text-[11px] text-white/45">{state.latest.staged === 100 ? "full rollout" : `${state.latest.staged}% rollout`}</div>
              </>
            ) : (
              <div className="text-[13px] text-white/45">No release info yet — run a check.</div>
            )}
          </InfoCard>
          <InfoCard title="Release channel" icon={<Tag className="h-4 w-4 text-[#60a5fa]" />}>
            <select
              value={state.channel}
              onChange={(e) => { manager.setChannel(e.target.value); toast({ title: `Channel: ${RELEASE_CHANNELS[e.target.value].label}` }); }}
              className="w-full rounded-lg border border-white/[0.08] bg-[#0a0f1e] px-3 py-2 text-[13px] text-white outline-none focus:border-[#3b82f6]"
            >
              {Object.values(RELEASE_CHANNELS).map((c) => (
                <option key={c.id} value={c.id}>{c.label} — {c.description}</option>
              ))}
            </select>
          </InfoCard>
          <InfoCard title="Last checked" icon={<Clock className="h-4 w-4 text-[#60a5fa]" />}>
            <div className="text-[13px] text-white/70">{state.lastChecked ? new Date(state.lastChecked).toLocaleString() : "Never"}</div>
            <div className="text-[11px] text-white/45">{caps.isDesktop ? "Connected to native updater" : "Web build — manifest source"}</div>
          </InfoCard>
        </div>

        {/* Release notes */}
        <Section title="What's new in this build" icon={<FileText className="h-4 w-4" />}>
          {NEXUS_RELEASE.releaseNotes.length > 0 && (
            <ul className="space-y-1.5">
              {NEXUS_RELEASE.releaseNotes.map((n, i) => (
                <li key={i} className="flex items-start gap-2 text-[12.5px] text-white/70">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" /> {n}
                </li>
              ))}
            </ul>
          )}
          {NEXUS_RELEASE.securityFixes.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-300">Security</div>
              <ul className="space-y-1.5">
                {NEXUS_RELEASE.securityFixes.map((n, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] text-white/70">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" /> {n}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {NEXUS_RELEASE.knownIssues.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">Known issues</div>
              <ul className="space-y-1.5">
                {NEXUS_RELEASE.knownIssues.map((n, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] text-white/55">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" /> {n}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        {/* Update history */}
        <Section title="Update history" icon={<History className="h-4 w-4" />}>
          {state.updateHistory.length === 0 ? (
            <div className="text-[12.5px] text-white/45">No recorded updates yet. When Nexus updates, each version is logged here.</div>
          ) : (
            <ul className="space-y-1.5">
              {state.updateHistory.map((h, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                  <span className="text-[12.5px] text-white/80">Nexus {h.version}</span>
                  <span className="text-[11px] text-white/45">{new Date(h.at).toLocaleString()} · {h.channel}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Architecture boundary (honest disclosure) */}
        <Section title="Update architecture" icon={<ShieldCheck className="h-4 w-4" />}>
          <p className="text-[12px] leading-relaxed text-white/55">
            Nexus updates are verified over HTTPS and validated against the release manifest before install. The native desktop shell
            performs signed-package verification, safe rollback, and automatic restart. The web build reads the same manifest and
            hands you the real installer — it never fabricates an update. Code signing requires a certificate supplied at the desktop
            packaging step; until then the architecture is ready for it but signing is not enforced.
          </p>
          {!caps.isDesktop && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#3b82f6]/30 bg-[#3b82f6]/10 px-3 py-2">
              <ExternalLink className="h-4 w-4 text-[#60a5fa]" />
              <button onClick={() => onNavigate?.("nexus://downloads")} className="text-[12.5px] font-medium text-[#60a5fa] hover:underline">
                Get the Nexus desktop app for real automatic updates
              </button>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function InfoCard({ title, icon, children }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">
        {icon} {title}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-white">
        {icon} {title}
      </div>
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">{children}</div>
    </div>
  );
}

function statusToMeta(status) {
  switch (status) {
    case UPDATE_STATUS.UP_TO_DATE:
      return { title: "You're up to date", subtitle: "Nexus is current on your release channel.", border: "border-emerald-500/30", bg: "bg-emerald-500/[0.06]", iconBg: "bg-emerald-500/15", icon: <CheckCircle2 className="h-6 w-6 text-emerald-400" /> };
    case UPDATE_STATUS.AVAILABLE:
      return { title: "Update available", subtitle: "A newer Nexus is ready for you.", border: "border-[#3b82f6]/40", bg: "bg-[#3b82f6]/[0.08]", iconBg: "bg-[#3b82f6]/20", icon: <Download className="h-6 w-6 text-[#60a5fa]" /> };
    case UPDATE_STATUS.DOWNLOADING:
      return { title: "Downloading update", subtitle: "Secure transfer in progress.", border: "border-[#3b82f6]/40", bg: "bg-[#3b82f6]/[0.08]", iconBg: "bg-[#3b82f6]/20", icon: <Loader2 className="h-6 w-6 animate-spin text-[#60a5fa]" /> };
    case UPDATE_STATUS.VERIFYING:
      return { title: "Verifying update", subtitle: "Checking integrity before install.", border: "border-[#3b82f6]/40", bg: "bg-[#3b82f6]/[0.08]", iconBg: "bg-[#3b82f6]/20", icon: <ShieldCheck className="h-6 w-6 text-[#60a5fa]" /> };
    case UPDATE_STATUS.READY:
      return { title: "Nexus is ready to update", subtitle: "Apply now or on next restart.", border: "border-emerald-500/30", bg: "bg-emerald-500/[0.06]", iconBg: "bg-emerald-500/15", icon: <CheckCircle2 className="h-6 w-6 text-emerald-400" /> };
    case UPDATE_STATUS.ERROR:
      return { title: "Update problem", subtitle: "Something went wrong. Try again, or check your connection.", border: "border-red-500/30", bg: "bg-red-500/[0.06]", iconBg: "bg-red-500/15", icon: <AlertTriangle className="h-6 w-6 text-red-400" /> };
    case UPDATE_STATUS.UNAVAILABLE:
      return { title: "Update service not connected", subtitle: "No release source is configured for this build yet. The architecture is ready; the channel goes live when the first signed build publishes.", border: "border-white/10", bg: "bg-white/[0.02]", iconBg: "bg-white/[0.06]", icon: <Clock className="h-6 w-6 text-white/60" /> };
    default:
      return { title: "Nexus updates", subtitle: "Check for the latest version or review release notes.", border: "border-white/10", bg: "bg-white/[0.02]", iconBg: "bg-white/[0.06]", icon: <RefreshCw className="h-6 w-6 text-white/70" /> };
  }
}