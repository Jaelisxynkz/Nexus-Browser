import React, { useEffect, useState } from "react";
import { Shield, Eye, Cookie, Zap, Globe, Lock, AlertCircle, ShieldOff } from "lucide-react";
import { loadPrivacyConfig, loadSiteState, getSiteConfig, normalizeHost } from "../privacyEngine";

/**
 * Nexus Shield — per-site protection panel.
 *
 * Honest by design: in the web runtime, Nexus cannot intercept network
 * requests, so no "trackers blocked" counter is shown. What it CAN show is
 * the effective privacy posture for the current site and let the user
 * override it per-site. The native shell feeds real block counts via
 * desktopRuntime (see desktopRuntime.js).
 */
export default function ShieldView({ activeUrl }) {
  const [cfg, setCfg] = useState(null);
  const [site, setSite] = useState(null);
  const host = normalizeHost(activeUrl);

  useEffect(() => {
    loadPrivacyConfig().then(setCfg);
    setSite(getSiteConfig(host));
  }, [activeUrl, host]);

  if (!cfg) return null;
  const effective = site?.profile || cfg.profile;

  const controls = [
    { icon: Globe, label: "HTTPS-Only", value: cfg.httpsOnly === "off" ? "Off" : cfg.httpsOnly === "strict" ? "Strict" : "Preferred" },
    { icon: Cookie, label: "3rd-party cookies", value: cfg.thirdPartyCookies ? "Allowed" : "Blocked" },
    { icon: Zap, label: "Scripts", value: site?.scripts || cfg.scriptControl === "allow" ? "Allowed" : cfg.scriptControl === "strict" ? "Strict" : "Blocked" },
    { icon: Eye, label: "Fingerprinting", value: (site?.fingerprint || cfg.fingerprint)[0].toUpperCase() + (site?.fingerprint || cfg.fingerprint).slice(1) },
    { icon: Lock, label: "Referrer", value: cfg.referrer[0].toUpperCase() + cfg.referrer.slice(1) },
  ];

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="flex items-center gap-3 border-b border-border/40 pb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent"><Shield className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold font-display text-foreground">Nexus Shield</h1>
          <p className="truncate text-[12px] text-muted-foreground">Protection for {host || "this page"}</p>
        </div>
        <span className="rounded-lg bg-accent/15 px-2.5 py-1 text-[10px] font-semibold text-accent">{effective[0].toUpperCase() + effective.slice(1)}</span>
      </div>

      <div className="mt-5 rounded-xl border border-border/40 bg-amber-500/5 p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-[11px] leading-relaxed text-amber-200/80">
            Real-time tracker/ad blocking requires the native Nexus shell to inspect network requests. This web build
            cannot see requests, so no blocked-counts are shown — any number here would be fabricated. Use the
            desktop build for live Shields.
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-border/40">
        {controls.map((c, i) => (
          <div key={c.label} className={`flex items-center justify-between px-4 py-3 ${i % 2 === 0 ? "bg-card/30" : "bg-card/10"}`}>
            <span className="flex items-center gap-2 text-[12px] text-foreground"><c.icon className="h-4 w-4 text-accent" /> {c.label}</span>
            <span className="text-[11px] font-medium text-muted-foreground">{c.value}</span>
          </div>
        ))}
      </div>

      {site && (
        <div className="mt-5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Per-site override</div>
          <div className="rounded-xl border border-border/40 bg-card/40 p-4 text-[12px] text-muted-foreground">
            This site has a custom rule: profile <b className="text-foreground">{site.profile}</b>
            {site.cookies !== undefined && <>, cookies <b className="text-foreground">{site.cookies ? "allowed" : "blocked"}</b></>}
            {site.scripts && <>, scripts <b className="text-foreground">{site.scripts}</b></>}.
          </div>
        </div>
      )}
    </div>
  );
}