import React, { useEffect, useState, useMemo } from "react";
import {
  Sparkles, Palette, Search, ShieldCheck, Gauge, Volume2, ChevronRight,
  ChevronLeft, Check, CheckCircle2, RotateCw,
} from "lucide-react";
import { useNexusSettings } from "@/components/nexus/useNexusSettings";
import { useTheme } from "@/components/nexus/Theme";
import { SEARCH_ENGINES } from "@/components/nexus/searchEngine";
import { RELEASE_CHANNELS, DEFAULT_CHANNEL } from "@/components/nexus/release";
import { detectCapabilities } from "@/components/nexus/capabilityDetect";
import { getCapabilities } from "@/components/nexus/desktopRuntime";
import { useToast } from "@/components/ui/use-toast";
import NexusLogo from "@/components/nexus/NexusLogo";

const WIZARD_STORAGE_KEY = "nexus.firstlaunch.completed";

export function isFirstLaunchComplete() {
  try { return localStorage.getItem(WIZARD_STORAGE_KEY) === "true"; } catch { return false; }
}
export function markFirstLaunchComplete() {
  try { localStorage.setItem(WIZARD_STORAGE_KEY, "true"); } catch {}
}

const STEPS = [
  { id: "welcome", title: "Welcome", icon: Sparkles },
  { id: "theme", title: "Theme", icon: Palette },
  { id: "search", title: "Search", icon: Search },
  { id: "privacy", title: "Privacy", icon: ShieldCheck },
  { id: "performance", title: "Performance", icon: Gauge },
  { id: "audio", title: "Audio", icon: Volume2 },
  { id: "done", title: "Ready", icon: CheckCircle2 },
];

export default function FirstLaunchWizard({ onComplete }) {
  const { settings, update, updateMany } = useNexusSettings();
  const { setTheme, themes } = useTheme();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [caps, setCaps] = useState(null);
  const runtimeCaps = useMemo(() => getCapabilities(), []);

  useEffect(() => {
    detectCapabilities().then((c) => setCaps(c));
  }, []);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = () => {
    markFirstLaunchComplete();
    toast({ title: "Nexus is set up", description: "Enjoy your new browser." });
    onComplete?.();
  };

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#05070d]">
      <div className="nexus-hero-grain absolute inset-0 opacity-60" />
      <div className="nexus-aurora nexus-aurora-a left-[10%] top-[-10%] h-[360px] w-[360px] bg-[#3b82f6]/20" />
      <div className="nexus-aurora nexus-aurora-b right-[8%] bottom-[5%] h-[340px] w-[340px] bg-[#8b5cf6]/18" />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0a0e18]/90 shadow-2xl backdrop-blur-xl">
        {/* Progress header */}
        <div className="border-b border-white/[0.06] px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#1e3a8a] shadow-[0_0_18px_rgba(59,130,246,0.4)]">
              <NexusLogo size={20} />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-white">Nexus Setup</div>
              <div className="text-[11px] text-white/45">Step {step + 1} of {STEPS.length} — {current.title}</div>
            </div>
          </div>
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] transition-all duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>

        {/* Step content */}
        <div className="px-8 py-7">
          {current.id === "welcome" && <WelcomeStep runtimeCaps={runtimeCaps} />}
          {current.id === "theme" && <ThemeStep settings={settings} update={update} setTheme={setTheme} themes={themes} />}
          {current.id === "search" && <SearchStep settings={settings} update={update} />}
          {current.id === "privacy" && <PrivacyStep settings={settings} update={update} runtimeCaps={runtimeCaps} />}
          {current.id === "performance" && <PerformanceStep settings={settings} update={update} caps={caps} />}
          {current.id === "audio" && <AudioStep settings={settings} update={update} />}
          {current.id === "done" && <DoneStep />}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t border-white/[0.06] px-8 py-5">
          <button
            onClick={back}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] text-white/55 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-6 py-2.5 text-[13px] font-medium text-white shadow-[0_0_16px_rgba(59,130,246,0.4)] transition hover:bg-[#2563eb]"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={finish}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-6 py-2.5 text-[13px] font-medium text-white shadow-[0_0_16px_rgba(16,185,129,0.4)] transition hover:bg-emerald-400"
            >
              <Check className="h-4 w-4" /> Start browsing
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({ runtimeCaps }) {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold tracking-tight text-white" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Welcome to Nexus</h2>
      <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-white/55">
        A quick setup gets your browser feeling like home. We'll tune the essentials now — you can change anything later in Settings.
      </p>
      <div className="mt-6 grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="text-white/40">Environment</div>
          <div className="mt-0.5 font-medium text-white">{runtimeCaps.isDesktop ? "Desktop app" : runtimeCaps.isPwa ? "PWA" : "Web"}</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="text-white/40">Updates</div>
          <div className="mt-0.5 font-medium text-white">{runtimeCaps.canSelfUpdate ? "Automatic" : "Manual"}</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="text-white/40">Release</div>
          <div className="mt-0.5 font-medium text-white">Stable</div>
        </div>
      </div>
    </div>
  );
}

function ThemeStep({ settings, update, setTheme, themes }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">Choose your theme</h2>
      <p className="mt-1 text-[12.5px] text-white/50">Pick a starting palette. You can customize accent and density later.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {Object.entries(themes).map(([key, t]) => (
          <button key={key} onClick={() => { setTheme(key); update("theme", key); }}
            className={`rounded-2xl border p-3 text-left transition ${settings.theme === key ? "border-[#3b82f6] bg-[#3b82f6]/10" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"}`}>
            <div className="flex h-10 gap-1">
              {["--background", "--card", "--primary", "--accent", "--muted"].map((v) => (
                <span key={v} className="flex-1 rounded" style={{ background: `hsl(${t.vars[v]})` }} />
              ))}
            </div>
            <div className="mt-2 text-[12px] font-medium text-white">{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchStep({ settings, update }) {
  const engines = Object.values(SEARCH_ENGINES);
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">Default search engine</h2>
      <p className="mt-1 text-[12.5px] text-white/50">Nexus Search is tuned for privacy and speed. External engines open their results pages.</p>
      <div className="mt-5 grid gap-2.5">
        {engines.map((e) => (
          <button key={e.id} onClick={() => update("searchEngine", e.id)}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${settings.searchEngine === e.id ? "border-[#3b82f6] bg-[#3b82f6]/[0.08]" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"}`}>
            <div>
              <div className="text-[13.5px] font-medium text-white">{e.label}</div>
              {e.builtin && <div className="text-[11px] text-[#60a5fa]">Nexus built-in</div>}
            </div>
            {settings.searchEngine === e.id && <Check className="h-4 w-4 text-[#60a5fa]" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function PrivacyStep({ settings, update, runtimeCaps }) {
  const opts = [
    { key: "trackingProtection", label: "Tracking protection", desc: "Block trackers at standard level." },
    { key: "adBlocking", label: "Ad blocking", desc: "Hide intrusive ads." },
    { key: "thirdPartyCookies", label: "Block third-party cookies", desc: "Prevent cross-site tracking." },
  ];
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">Privacy baseline</h2>
      <p className="mt-1 text-[12.5px] text-white/50">Sensible defaults — adjust anytime in Privacy settings.</p>
      <div className="mt-5 space-y-2.5">
        {opts.map((o) => (
          <div key={o.key} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div>
              <div className="text-[13px] font-medium text-white">{o.label}</div>
              <div className="text-[11px] text-white/45">{o.desc}</div>
            </div>
            <Toggle on={!!settings[o.key]} onClick={() => update(o.key, !settings[o.key])} />
          </div>
        ))}
      </div>
      {!runtimeCaps.isDesktop && (
        <p className="mt-4 text-[11px] leading-relaxed text-white/40">
          Site permissions (camera, mic, location) are managed by your OS browser in this environment — the Nexus desktop app handles them directly.
        </p>
      )}
    </div>
  );
}

function PerformanceStep({ settings, update, caps }) {
  const modes = ["performance", "balanced", "high", "ultra"];
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">Performance mode</h2>
      <p className="mt-1 text-[12.5px] text-white/50">
        {caps ? `Detected: ${caps.cores || "?"} cores · ${caps.memory ? caps.memory + " GB" : "unknown memory"} · recommended tier: ${caps.recommendedTier}` : "Detecting your hardware…"}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {modes.map((m) => (
          <button key={m} onClick={() => update("vfxQuality", m)}
            className={`rounded-xl border px-4 py-3 text-left transition capitalize ${settings.vfxQuality === m ? "border-[#3b82f6] bg-[#3b82f6]/[0.08]" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"}`}>
            <div className="text-[13px] font-medium text-white">{m}</div>
            {caps && caps.recommendedVfx === m && <div className="text-[10px] text-emerald-400">Recommended for your device</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function AudioStep({ settings, update }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">Audio & effects</h2>
      <p className="mt-1 text-[12.5px] text-white/50">Tasteful feedback — or total silence, your call.</p>
      <div className="mt-5 space-y-2.5">
        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <div><div className="text-[13px] font-medium text-white">UI sounds</div><div className="text-[11px] text-white/45">Subtle feedback on actions.</div></div>
          <Toggle on={!!settings.uiSounds} onClick={() => update("uiSounds", !settings.uiSounds)} />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <div><div className="text-[13px] font-medium text-white">Animations</div><div className="text-[11px] text-white/45">Motion and transitions.</div></div>
          <Toggle on={!!settings.animations} onClick={() => update("animations", !settings.animations)} />
        </div>
      </div>
    </div>
  );
}

function DoneStep() {
  return (
    <div className="text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/15">
        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-white" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>You're all set</h2>
      <p className="mx-auto mt-3 max-w-sm text-[13.5px] leading-relaxed text-white/55">
        Nexus is ready. Everything you just set is saved — revisit Settings anytime to refine.
      </p>
      <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-white/40">
        <RotateCw className="h-3.5 w-3.5" /> Tip: press <kbd className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-white/70">Ctrl + K</kbd> for the Command Center
      </div>
    </div>
  );
}

function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} className={`relative h-6 w-11 rounded-full transition ${on ? "bg-[#3b82f6]" : "bg-white/[0.1]"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}