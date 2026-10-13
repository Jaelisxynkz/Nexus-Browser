import React, { useEffect, useMemo, useState } from "react";
import {
  Lock, Shield, ShieldAlert, Globe, Zap, Eye, AlertTriangle, Gauge, Network,
} from "lucide-react";
import { loadSecurityConfig, saveSecurityConfig, SECURITY_LEVELS, securityScore } from "../privacyEngine";
import { useToast } from "@/components/ui/use-toast";

function Toggle({ on, onChange, label, desc }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2">
      <div>
        <div className="text-[12px] font-medium text-foreground">{label}</div>
        {desc && <div className="text-[10px] text-muted-foreground/60">{desc}</div>}
      </div>
      <button type="button" onClick={() => onChange(!on)} className={`relative h-5 w-9 rounded-full transition ${on ? "bg-accent" : "bg-muted"}`} role="switch" aria-checked={on}>
        <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition" style={{ left: on ? "18px" : "2px" }} />
      </button>
    </label>
  );
}

export default function SecurityView() {
  const [cfg, setCfg] = useState(null);
  const { toast } = useToast();

  useEffect(() => { loadSecurityConfig().then(setCfg); }, []);
  const update = (patch) => { setCfg((p) => ({ ...p, ...patch })); saveSecurityConfig(patch); };
  const score = useMemo(() => (cfg ? securityScore(cfg) : 0), [cfg]);

  if (!cfg) return <div className="px-6 py-10 text-[13px] text-muted-foreground">Loading security settings…</div>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center gap-3 border-b border-border/40 pb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent"><Lock className="h-5 w-5" /></div>
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Security Center</h1>
          <p className="text-[12px] text-muted-foreground">Configure how Nexus defends against active threats.</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Security Posture</div>
            <div className="mt-1 text-3xl font-bold text-foreground">{score}<span className="text-base text-muted-foreground">/100</span></div>
          </div>
          <div className="text-right text-[11px] text-muted-foreground/70 max-w-[260px]">
            Stronger levels restrict web features. Some sites may malfunction — like Tor Browser's security-level tradeoff.
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-to-r from-accent to-primary transition-all" style={{ width: `${score}%` }} />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="overflow-hidden rounded-xl border border-border/40 bg-card/40 p-4">
          <div className="text-[13px] font-semibold text-foreground">Security Level</div>
          <p className="mt-1 text-[11px] text-muted-foreground/70">Controls how aggressively risky web features are restricted.</p>
          <div className="mt-3 inline-flex rounded-lg border border-border/40 bg-muted/40 p-0.5">
            {SECURITY_LEVELS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => { update({ level: lvl }); toast({ title: `Security: ${lvl[0].toUpperCase() + lvl.slice(1)}` }); }}
                className={`rounded-md px-3 py-1 text-[11px] font-medium transition ${cfg.level === lvl ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {lvl[0].toUpperCase() + lvl.slice(1)}
              </button>
            ))}
          </div>
          {cfg.level === "maximum" && (
            <p className="mt-3 flex items-center gap-1.5 text-[10px] text-amber-400"><AlertTriangle className="h-3 w-3" /> Maximum security may break media, downloads, and interactive sites.</p>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-border/40 bg-card/40 p-4">
          <Toggle on={cfg.blockMixedContent} onChange={(v) => update({ blockMixedContent: v })} label="Block mixed content" desc="Stops insecure HTTP resources on HTTPS pages." />
          <Toggle on={cfg.blockDangerousDownloads} onChange={(v) => update({ blockDangerousDownloads: v })} label="Block dangerous file types" desc="Executable/archive blocking needs native runtime for real scanning." />
          <div className="flex items-center justify-between py-2">
            <span className="text-[12px] font-medium text-foreground">Autoplay policy</span>
            <select value={cfg.autoplay} onChange={(e) => update({ autoplay: e.target.value })} className="rounded-lg border border-border/40 bg-muted px-2 py-1 text-[11px] text-foreground outline-none">
              <option value="allow">Allow</option>
              <option value="block">Block</option>
              <option value="limit">Limit</option>
            </select>
          </div>
          <Toggle on={cfg.restrictWebRTC} onChange={(v) => update({ restrictWebRTC: v })} label="Restrict WebRTC" desc="Reduces local-IP exposure. Full IP hiding needs a VPN / native runtime." />
        </div>

        <div className="overflow-hidden rounded-xl border border-border/40 bg-card/40 p-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground"><Network className="h-4 w-4 text-accent" /> Origin Isolation</div>
          <p className="mt-1 text-[11px] text-muted-foreground/70">
            True site isolation (separate OS process per origin) requires the native Nexus shell. This web build runs in a shared browser process and cannot fake process-level isolation.
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-400">
            <AlertTriangle className="h-3 w-3" /> Native Runtime Required
          </div>
        </div>
      </div>
    </div>
  );
}