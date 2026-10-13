import React, { useEffect, useMemo, useState } from "react";
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Gauge } from "lucide-react";
import { loadPrivacyConfig, loadSecurityConfig, loadSiteState, privacyScore, securityScore } from "../privacyEngine";

/**
 * Nexus Privacy Audit + Security Audit.
 * Checks real configuration only. Recommendations are actionable and honest.
 */
export default function PrivacyAuditView() {
  const [privacy, setPrivacy] = useState(null);
  const [security, setSecurity] = useState(null);
  const [sites, setSites] = useState({});

  useEffect(() => {
    loadPrivacyConfig().then(setPrivacy);
    loadSecurityConfig().then(setSecurity);
    setSites(loadSiteState());
  }, []);

  const checks = useMemo(() => {
    if (!privacy || !security) return [];
    return [
      { ok: !privacy.thirdPartyCookies, label: "Third-party cookies blocked", fix: "Privacy → Cookies → Block third-party cookies" },
      { ok: privacy.gpc, label: "Global Privacy Control enabled", fix: "Privacy → Privacy Signals → Send GPC" },
      { ok: privacy.httpsOnly !== "off", label: "HTTPS-Only active", fix: "Privacy → Connection → HTTPS-Only" },
      { ok: privacy.fingerprint !== "balanced", label: "Fingerprint protection above Balanced", fix: "Privacy → Fingerprinting → Strong or Maximum" },
      { ok: privacy.referrer !== "standard", label: "Referrer reduced", fix: "Privacy → Connection → Referrer Policy" },
      { ok: privacy.stripTrackingParams, label: "Tracking-parameter stripping on", fix: "Privacy → Tracking → Strip tracking parameters" },
      { ok: privacy.popupProtection, label: "Popup protection on", fix: "Privacy → Tracking → Popup protection" },
      { ok: privacy.clearPrivateOnClose, label: "Private data clears on close", fix: "Privacy → Private Session → Clear on close" },
      { ok: !privacy.incognitoOnStartup, label: "Private tabs never restored", fix: "Privacy → Private Session → Never restore" },
      { ok: !privacy.telemetry, label: "Telemetry off", fix: "Privacy → Telemetry → Keep off" },
      { ok: security.blockMixedContent, label: "Mixed content blocked", fix: "Security → Block mixed content" },
      { ok: security.blockDangerousDownloads, label: "Dangerous downloads restricted", fix: "Security → Block dangerous file types" },
      { ok: security.autoplay === "block", label: "Autoplay blocked", fix: "Security → Autoplay → Block" },
      { ok: Object.keys(sites).length < 20, label: "No excessive site exceptions", fix: "Privacy → Site Exceptions → review" },
    ];
  }, [privacy, security, sites]);

  if (!privacy || !security) return <div className="px-6 py-10 text-[13px] text-muted-foreground">Running audit…</div>;

  const pScore = privacyScore(privacy);
  const sScore = securityScore(security);
  const passed = checks.filter((c) => c.ok).length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center gap-3 border-b border-border/40 pb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent"><ShieldCheck className="h-5 w-5" /></div>
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Privacy & Security Audit</h1>
          <p className="text-[12px] text-muted-foreground">A local check of your real Nexus configuration.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Privacy Posture</div>
          <div className="mt-1 text-3xl font-bold text-foreground">{pScore}<span className="text-base text-muted-foreground">/100</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-accent to-primary" style={{ width: `${pScore}%` }} /></div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Security Posture</div>
          <div className="mt-1 text-3xl font-bold text-foreground">{sScore}<span className="text-base text-muted-foreground">/100</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-accent to-primary" style={{ width: `${sScore}%` }} /></div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">{passed}/{checks.length} checks passed</div>
        <div className="overflow-hidden rounded-xl border border-border/40">
          {checks.map((c, i) => (
            <div key={i} className={`flex items-start gap-3 px-4 py-3 ${i % 2 === 0 ? "bg-card/30" : "bg-card/10"}`}>
              {c.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />}
              <div className="flex-1">
                <div className="text-[12px] text-foreground">{c.label}</div>
                {!c.ok && <div className="text-[10px] text-muted-foreground/60">Fix: {c.fix}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-border/40 bg-card/40 p-4">
        <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-[11px] leading-relaxed text-muted-foreground/80">
          Scores reflect configuration strength only. They are not a guarantee of anonymity or immunity from tracking.
          No score is ever shown as "100% private."
        </p>
      </div>
    </div>
  );
}