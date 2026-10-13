import React, { useEffect, useState } from "react";
import { Fingerprint, AlertTriangle, Shield, Eye, Cpu, Globe, Battery, Monitor } from "lucide-react";
import { loadPrivacyConfig, savePrivacyConfig, FINGERPRINT_MODES } from "../privacyEngine";

// What this web runtime actually exposes — shown honestly.
function detectSurface() {
  const out = [];
  out.push({ icon: Globe, label: "User-Agent", value: navigator.userAgent.slice(0, 64) + "…", reducible: "Native runtime can freeze/standardize UA. Web build exposes the real one." });
  out.push({ icon: Globe, label: "Languages", value: (navigator.languages || []).join(", "), reducible: "Reduced in Strong/Maximum via Accept-Language; full hiding needs native." });
  out.push({ icon: Monitor, label: "Screen", value: `${screen.width}×${screen.height}`, reducible: "Native runtime can round to common buckets; web build exposes real dimensions." });
  out.push({ icon: Cpu, label: "Hardware cores", value: String(navigator.hardwareConcurrency || "unknown"), reducible: "Reduced in Maximum by capping reported cores — needs native to truly override." });
  out.push({ icon: Battery, label: "Device memory", value: String(navigator.deviceMemory || "unknown") + " GB", reducible: "Maximum mode can hide this via native; not overridable from web." });
  out.push({ icon: Eye, label: "Canvas", value: "Exposed", reducible: "Randomization/noise injection requires native canvas interception." });
  out.push({ icon: Eye, label: "WebGL", value: "Exposed", reducible: "WebGL vendor/renderer can be hidden only with native GPU-process control." });
  return out;
}

const PROTECTIONS = [
  { mode: "balanced", label: "Balanced", desc: "Low breakage. Strips tracking params, reduces referrer, sends GPC." },
  { mode: "strong", label: "Strong", desc: "Also reduces client hints, freezes UA major version, limits navigator surface." },
  { mode: "maximum", label: "Maximum", desc: "Aggressive: caps cores/memory, rounds screen, reduces languages. May break sites." },
];

export default function FingerprintView() {
  const [cfg, setCfg] = useState(null);
  const [surface] = useState(detectSurface);

  useEffect(() => { loadPrivacyConfig().then(setCfg); }, []);
  const update = (patch) => { setCfg((p) => ({ ...p, ...patch })); savePrivacyConfig(patch); };

  if (!cfg) return <div className="px-6 py-10 text-[13px] text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center gap-3 border-b border-border/40 pb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent"><Fingerprint className="h-5 w-5" /></div>
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Fingerprint Protection</h1>
          <p className="text-[12px] text-muted-foreground">Reduce identifying surface — honestly.</p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border/40 bg-card/40 p-4">
        <p className="text-[12px] leading-relaxed text-muted-foreground/80">
          Fingerprinting combines dozens of visible signals (screen, fonts, GPU, timing) into a unique ID for your browser.
          Nexus reduces exposure to known surfaces but <b>cannot fully defeat fingerprinting</b> — a determined tracker can
          always find new signals. This is privacy-through-reduction, not anonymity.
        </p>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {PROTECTIONS.map((p) => (
          <button
            key={p.mode}
            onClick={() => update({ fingerprint: p.mode })}
            className={`rounded-xl border p-4 text-left transition ${cfg.fingerprint === p.mode ? "border-accent bg-accent/10" : "border-border/40 bg-card/40 hover:border-border"}`}
          >
            <div className="text-[13px] font-semibold text-foreground">{p.label}</div>
            <div className="mt-1 text-[10px] leading-relaxed text-muted-foreground/70">{p.desc}</div>
          </button>
        ))}
      </div>

      <div className="mt-5">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">What your browser exposes right now</div>
        <div className="overflow-hidden rounded-xl border border-border/40">
          {surface.map((s, i) => (
            <div key={i} className={`flex items-start gap-3 px-4 py-3 ${i % 2 === 0 ? "bg-card/30" : "bg-card/10"}`}>
              <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-foreground">{s.label}</div>
                <div className="truncate text-[10px] text-muted-foreground/60">{s.value}</div>
                <div className="mt-1 text-[10px] text-muted-foreground/50">{s.reducible}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p className="text-[11px] leading-relaxed text-amber-200/80">
          We do <b>not</b> invent fake hardware. Forging a fake GPU or fake screen size is spoofing, not privacy —
          trackers can detect inconsistencies and use them as a stronger signal. Nexus reduces, standardizes, and
          limits exposure instead.
        </p>
      </div>
    </div>
  );
}