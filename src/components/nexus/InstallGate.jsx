/**
 * InstallGate — blocks the browser shell from running in a web browser.
 *
 * Nexus is a desktop application. When the web build is opened in a normal
 * browser tab (not the native Electron shell), the full browser experience is
 * gated behind an install screen. This is intentional: core features (real
 * browser tabs, incognito isolation, ad blocking, downloads, auto-update)
 * only work inside the native runtime — pretending otherwise would be
 * dishonest.
 *
 * Detection is authoritative: `detectRuntime()` returns "desktop" only when
 * the native preload bridge (`window.__nexus`) is present. Once the user
 * installs and launches the desktop app, that bridge exists and this gate
 * never renders.
 */
import React, { useMemo } from "react";
import { detectRuntime, RUNTIME_ENV } from "./desktopRuntime";
import { resolveDownload, PLATFORM_TARGETS } from "./platformDownload";
import { NEXUS_RELEASE, formatVersion } from "./release";
import NexusLogo from "./NexusLogo";
import { useToast } from "@/components/ui/use-toast";
import {
  Monitor, Apple, TerminalSquare, Download, ChevronRight, Lock,
  Zap, ShieldCheck, Sparkles, CheckCircle2, ArrowRight,
} from "lucide-react";

export default function InstallGate({ children }) {
  const runtime = detectRuntime();
  if (runtime === RUNTIME_ENV.DESKTOP) return children;
  return <InstallScreen />;
}

function InstallScreen() {
  const { toast } = useToast();
  const { host, primary, alternatives } = useMemo(() => resolveDownload(), []);

  const platformIcon = (os) =>
    os === "windows" ? <Monitor className="h-5 w-5" /> :
    os === "macos" ? <Apple className="h-5 w-5" /> :
    <TerminalSquare className="h-5 w-5" />;

  const triggerDownload = (target) => {
    if (!target.available || !target.downloadUrl) {
      toast({
        title: `${target.label} build not available yet`,
        description: target.notes,
        variant: "destructive",
      });
      return;
    }
    toast({ title: `Downloading Nexus for ${target.label}`, description: target.fileName });
    const a = document.createElement("a");
    a.href = target.downloadUrl;
    a.download = target.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="relative min-h-screen overflow-y-auto nexus-scroll bg-[#070a14] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="nexus-hero-grain absolute inset-0" />
        <div className="nexus-aurora nexus-aurora-a left-[10%] top-[-15%] h-[460px] w-[460px] bg-[#3b82f6]/20" />
        <div className="nexus-aurora nexus-aurora-b right-[8%] top-[15%] h-[400px] w-[400px] bg-[#8b5cf6]/18" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        {/* Lock badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1.5 text-[12px] font-medium text-amber-300">
          <Lock className="h-3.5 w-3.5" />
          Desktop installation required
        </div>

        {/* Logo */}
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#1e3a8a] shadow-[0_0_40px_rgba(59,130,246,0.4)]">
          <NexusLogo size={32} />
        </div>

        <h1
          className="nexus-title mt-6 inline-block text-5xl font-bold tracking-[0.04em] sm:text-6xl"
          style={{ fontFamily: '"Space Grotesk", sans-serif' }}
        >
          NEXUS
        </h1>

        <h2 className="mt-6 text-[20px] font-semibold text-white/90">
          Install Nexus to continue
        </h2>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/55">
          Nexus is a desktop browser. The full experience — real browser tabs,
          incognito isolation, network ad blocking, download manager, and
          automatic updates — only works inside the native app. Install it to
          unlock everything.
        </p>

        {/* Primary download */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            onClick={() => triggerDownload(primary)}
            disabled={!primary.available}
            className="group inline-flex items-center gap-3 rounded-2xl bg-[#3b82f6] px-8 py-4 text-[16px] font-semibold text-white shadow-[0_0_30px_rgba(59,130,246,0.45)] transition hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {platformIcon(primary.os)}
            Download for {primary.label}
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <div className="text-[12px] text-white/40">
            {primary.available
              ? `${primary.fileName} · ${formatVersion(NEXUS_RELEASE.version, NEXUS_RELEASE.build)} · ${primary.notes}`
              : primary.notes}
          </div>
        </div>

        {/* Platform alternatives */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {alternatives.map((t) => (
            <button
              key={t.os}
              onClick={() => triggerDownload(t)}
              className={`group inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-medium transition ${
                t.available
                  ? "border-white/15 bg-white/[0.03] text-white/80 hover:border-white/30 hover:bg-white/[0.06]"
                  : "border-white/[0.06] bg-white/[0.01] text-white/40"
              }`}
            >
              {platformIcon(t.os)}
              {t.label}
              {!t.available && <span className="text-[10px] text-white/30">soon</span>}
            </button>
          ))}
        </div>

        {/* What you unlock */}
        <div className="mt-12 w-full max-w-md rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-left">
          <div className="mb-3 text-[13px] font-semibold text-white">What the desktop app unlocks</div>
          <div className="grid gap-2.5">
            {[
              { icon: <Zap className="h-4 w-4 text-[#60a5fa]" />, label: "Real browser tabs (not iframes)" },
              { icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />, label: "True incognito with session isolation" },
              { icon: <Lock className="h-4 w-4 text-[#a78bfa]" />, label: "Network-level ad & tracker blocking" },
              { icon: <Download className="h-4 w-4 text-cyan-400" />, label: "Native download manager with progress" },
              { icon: <Sparkles className="h-4 w-4 text-pink-400" />, label: "Automatic verified updates" },
              { icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />, label: "Crash recovery & session restore" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2.5 text-[12.5px] text-white/70">
                {f.icon} {f.label}
              </div>
            ))}
          </div>
        </div>

        {/* Honest note */}
        <div className="mt-6 max-w-md text-[11.5px] leading-relaxed text-white/35">
          After installing, launch Nexus from your applications folder or Start
          menu. This gate won't appear inside the desktop app — it only shows
          when Nexus is opened in a regular browser tab.
        </div>

        <div className="mt-8 flex items-center gap-2 text-[11px] text-white/30">
          <span>Current release: {formatVersion(NEXUS_RELEASE.version, NEXUS_RELEASE.build)}</span>
          <span className="text-white/15">·</span>
          <span>codename "{NEXUS_RELEASE.codename}"</span>
        </div>
      </div>
    </div>
  );
}