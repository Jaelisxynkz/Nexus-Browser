import React, { useMemo, useState } from "react";
import {
  Download, Monitor, Apple, TerminalSquare, ShieldCheck, Cpu,
  ChevronRight, Globe, Sparkles, Zap, CheckCircle2, Clock,
} from "lucide-react";
import { resolveDownload, PLATFORM_TARGETS } from "@/components/nexus/platformDownload";
import { NEXUS_RELEASE, formatVersion } from "@/components/nexus/release";
import NexusLogo from "@/components/nexus/NexusLogo";
import { useToast } from "@/components/ui/use-toast";

/**
 * DownloadView — Nexus website download page.
 *
 * Detects the visitor's OS and presents the correct Nexus installer. Honest:
 * only platforms that genuinely ship are offered as downloads; the rest are
 * shown as "planned" rather than broken buttons. The Windows build downloads
 * the real Nexus launcher/installer from the release pipeline.
 */
export default function DownloadView() {
  const { toast } = useToast();
  const { host, primary, alternatives } = useMemo(() => resolveDownload(), []);
  const [agreed, setAgreed] = useState(false);

  const onDownload = () => {
    if (!primary.available || !primary.downloadUrl) {
      toast({
        title: `${primary.label} build not available yet`,
        description: primary.notes,
        variant: "destructive",
      });
      return;
    }
    // Trigger a real download from the GitHub Releases artifact.
    toast({ title: `Downloading Nexus for ${primary.label}`, description: primary.fileName });
    const a = document.createElement("a");
    a.href = primary.downloadUrl;
    a.download = primary.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const platformIcon = (os) =>
    os === "windows" ? <Monitor className="h-5 w-5" /> :
    os === "macos" ? <Apple className="h-5 w-5" /> :
    <TerminalSquare className="h-5 w-5" />;

  return (
    <div className="min-h-full overflow-y-auto nexus-scroll bg-[#070a14] text-white">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="nexus-hero-grain absolute inset-0" />
        <div className="nexus-aurora nexus-aurora-a left-[8%] top-[-20%] h-[420px] w-[420px] bg-[#3b82f6]/25" />
        <div className="nexus-aurora nexus-aurora-b right-[6%] top-[10%] h-[380px] w-[380px] bg-[#8b5cf6]/20" />
        <div className="relative mx-auto max-w-3xl px-8 pb-16 pt-16 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#1e3a8a] shadow-[0_0_40px_rgba(59,130,246,0.4)]">
            <NexusLogo size={32} />
          </div>
          <h1 className="nexus-title mt-6 inline-block text-5xl font-bold tracking-[0.04em] sm:text-6xl" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
            NEXUS
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/60">
            The browser that thinks ahead. Download the real desktop app and keep everything — tabs, workspaces, and settings — in sync.
          </p>

          {/* Primary download CTA */}
          <div className="mt-10 flex flex-col items-center gap-3">
            <button
              onClick={onDownload}
              disabled={!primary.available}
              className="group inline-flex items-center gap-3 rounded-2xl bg-[#3b82f6] px-8 py-4 text-[16px] font-semibold text-white shadow-[0_0_30px_rgba(59,130,246,0.45)] transition hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {platformIcon(primary.os)}
              Download Nexus for {primary.label}
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <div className="text-[12px] text-white/45">
              {primary.available
                ? `${primary.fileName} · ${formatVersion(NEXUS_RELEASE.version, NEXUS_RELEASE.build)} · ${primary.notes}`
                : primary.notes}
            </div>
          </div>

          {/* Platform alternatives */}
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {Object.values(PLATFORM_TARGETS).map((t) => (
              <PlatformCard key={t.os} target={t} icon={platformIcon(t.os)} isCurrent={host?.os === t.os} />
            ))}
          </div>
        </div>
      </div>

      {/* Feature strip */}
      <div className="mx-auto max-w-4xl px-8 py-14">
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { icon: <Zap className="h-5 w-5 text-[#60a5fa]" />, title: "Fast by design", body: "GPU-accelerated UI, sleeping tabs, and a performance mode that adapts to your hardware." },
            { icon: <ShieldCheck className="h-5 w-5 text-emerald-400" />, title: "Private by default", body: "Tracking protection, safe search, and a desktop runtime that never sends your data anywhere you didn't ask." },
            { icon: <Sparkles className="h-5 w-5 text-[#a78bfa]" />, title: "Nexus AI inside", body: "A real assistant that reads the page, writes notes, and automates research — without leaving the browser." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04]">{f.icon}</div>
              <div className="mt-3 text-[14px] font-semibold">{f.title}</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-white/50">{f.body}</p>
            </div>
          ))}
        </div>

        {/* What's included */}
        <div className="mt-12 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="mb-3 text-[13px] font-semibold text-white">What's in the desktop app</div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {[
              "Automatic, verified updates",
              "Crash recovery & session restore",
              "Native notifications and system tray",
              "File & URL associations",
              "Hardware-accelerated rendering",
              "Offline-capable shell",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-[12.5px] text-white/70">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> {item}
              </div>
            ))}
          </div>
        </div>

        {/* Honest architecture note */}
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-[#3b82f6]/25 bg-[#3b82f6]/[0.07] p-5">
          <Globe className="mt-0.5 h-5 w-5 shrink-0 text-[#60a5fa]" />
          <div>
            <div className="text-[13px] font-semibold text-white">Two experiences, one Nexus</div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-white/60">
              You're using <b className="text-white/85">Nexus Web</b> right now — the hosted version. The download gives you{" "}
              <b className="text-white/85">Nexus Desktop</b>, a real installed app with native windows, automatic updates, and OS
              integration. Same design, same data model, same Nexus. The desktop build is produced by the Nexus packaging pipeline
              (see <code className="rounded bg-white/[0.06] px-1">desktop/</code> in the project); the Windows build is the first
              shipping target.
            </p>
          </div>
        </div>

        {/* Version footer */}
        <div className="mt-10 flex items-center justify-between border-t border-white/[0.06] pt-6 text-[11px] text-white/40">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" /> Current release: {formatVersion(NEXUS_RELEASE.version, NEXUS_RELEASE.build)} — codename "{NEXUS_RELEASE.codename}"
          </div>
          <button onClick={() => window.open("nexus://updates", "_self")} className="text-[#60a5fa] hover:underline">
            Release notes →
          </button>
        </div>
      </div>
    </div>
  );
}

function PlatformCard({ target, icon, isCurrent }) {
  const { toast } = useToast();
  const onClick = () => {
    if (target.available && target.downloadUrl) {
      toast({ title: `Downloading for ${target.label}`, description: target.fileName });
      const a = document.createElement("a");
      a.href = target.downloadUrl;
      a.download = target.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      toast({ title: `${target.label} coming soon`, description: target.notes });
    }
  };
  return (
    <button
      onClick={onClick}
      className={`group rounded-2xl border p-4 text-left transition ${
        isCurrent ? "border-[#3b82f6]/50 bg-[#3b82f6]/[0.08]" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"
      } ${!target.available ? "opacity-70" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className={`grid h-9 w-9 place-items-center rounded-lg ${isCurrent ? "bg-[#3b82f6]/20 text-[#60a5fa]" : "bg-white/[0.04] text-white/70"}`}>
          {icon}
        </div>
        {isCurrent && <span className="rounded-full bg-[#3b82f6]/20 px-2 py-0.5 text-[10px] font-semibold text-[#60a5fa]">Current</span>}
        {!target.available && <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/45">Planned</span>}
      </div>
      <div className="mt-3 text-[13.5px] font-semibold text-white">{target.label}</div>
      <div className="mt-0.5 text-[11px] text-white/45">{target.fileName}</div>
      <div className="mt-2 flex items-center gap-1 text-[11px] text-[#60a5fa]">
        {target.available ? <>Download <ChevronRight className="h-3 w-3" /></> : "In the pipeline"}
      </div>
    </button>
  );
}