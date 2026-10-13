import React from "react";
import {
  ShieldAlert, ArrowLeft, ExternalLink, EyeOff, Copy, Flag, ChevronRight,
  AlertOctagon, CheckCircle2, AlertTriangle, Info,
} from "lucide-react";
import { levelInfo } from "./searchSecurity";

const LEVEL_STYLES = {
  low: { ring: "ring-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-400", icon: CheckCircle2 },
  guarded: { ring: "ring-sky-500/30", bg: "bg-sky-500/10", text: "text-sky-400", icon: Info },
  suspicious: { ring: "ring-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-400", icon: AlertTriangle },
  high: { ring: "ring-orange-500/30", bg: "bg-orange-500/10", text: "text-orange-400", icon: AlertTriangle },
  critical: { ring: "ring-rose-500/40", bg: "bg-rose-500/10", text: "text-rose-400", icon: AlertOctagon },
  unknown: { ring: "ring-slate-500/30", bg: "bg-slate-500/10", text: "text-slate-400", icon: Info },
};

/**
 * SecurityWarning — the "Proceed Anyway?" interstitial.
 *
 * Shows when the user tries to navigate to a URL with meaningful risk.
 * Default action is Go Back, never the dangerous navigation.
 */
export default function SecurityWarning({ assessment, url, onBack, onProceed, onOpenPrivate, onCopy, onReport }) {
  const level = assessment?.level || "unknown";
  const info = levelInfo(level);
  const style = LEVEL_STYLES[level] || LEVEL_STYLES.unknown;
  const Icon = style.icon;
  const isHigh = level === "high" || level === "critical";

  const signals = (assessment?.signals || []).filter((s) => !s.ok);
  const positiveSignals = (assessment?.signals || []).filter((s) => s.ok);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background/95 px-4 py-8 backdrop-blur-md">
      <div className={`w-full max-w-lg overflow-hidden rounded-2xl border ${style.ring} bg-card shadow-2xl`}>
        {/* Header */}
        <div className={`flex items-center gap-3 border-b border-border/40 px-5 py-4 ${style.bg}`}>
          <Icon className={`h-6 w-6 ${style.text}`} />
          <div className="flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Nexus Security
            </div>
            <div className={`text-[16px] font-bold ${style.text}`}>{info.label}</div>
          </div>
        </div>

        <div className="p-5">
          {/* Risk + Confidence */}
          <div className="mb-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground/60">Risk Score</div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${style.text}`}>{assessment?.risk ?? 0}</span>
                <span className="text-[11px] text-muted-foreground">/ 100</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground/60">Confidence</div>
              <div className={`text-[13px] font-semibold capitalize ${style.text}`}>{assessment?.confidence || "low"}</div>
            </div>
          </div>

          {/* Warning message */}
          <p className="mb-4 text-[13px] leading-relaxed text-foreground/90">
            {isHigh
              ? "This destination has characteristics that may indicate a serious security or phishing risk. Nexus recommends not proceeding."
              : "This destination has characteristics that may indicate a security risk. Review the details below before continuing."}
          </p>

          {/* URL */}
          <div className="mb-4 rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
            <div className="truncate font-mono text-[11px] text-muted-foreground">{url}</div>
          </div>

          {/* Detected signals */}
          {signals.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                Detected Signals ({signals.length})
              </div>
              <div className="space-y-1.5">
                {signals.map((s) => (
                  <div key={s.id} className="flex items-start gap-2 text-[12px]">
                    <AlertTriangle className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${s.severity >= 4 ? "text-rose-400" : s.severity >= 2 ? "text-amber-400" : "text-sky-400"}`} />
                    <div>
                      <span className="font-medium text-foreground">{s.label}</span>
                      <span className="ml-1 text-muted-foreground/70">— {s.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Positive signals */}
          {positiveSignals.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                Positive Signals
              </div>
              <div className="space-y-1.5">
                {positiveSignals.map((s) => (
                  <div key={s.id} className="flex items-start gap-2 text-[12px]">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    <div>
                      <span className="font-medium text-foreground">{s.label}</span>
                      <span className="ml-1 text-muted-foreground/70">— {s.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Honest disclaimer */}
          <div className="mb-4 rounded-lg border border-border/30 bg-muted/20 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground/70">
            <ShieldAlert className="mr-1 inline h-3 w-3" />
            This is a browser-side risk assessment, <b>not</b> a guarantee the site is safe or dangerous. Nexus found no major warning signals does not mean a site is harmless.
          </div>

          {/* Recommended action */}
          <div className="mb-4 rounded-lg border border-border/40 bg-card/60 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/60">Recommended Action</div>
            <div className="mt-0.5 text-[12px] text-foreground/90">{assessment?.recommendation}</div>
          </div>

          {/* Actions — Go Back is primary (default focus) */}
          <div className="flex flex-col gap-2">
            <button
              autoFocus
              onClick={onBack}
              className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-foreground transition hover:opacity-90"
            >
              <ArrowLeft className="h-4 w-4" /> Go Back (Recommended)
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onProceed}
                className="flex items-center gap-1.5 rounded-lg border border-border/40 px-3 py-2 text-[12px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Go To Site
              </button>
              <button
                onClick={onOpenPrivate}
                className="flex items-center gap-1.5 rounded-lg border border-border/40 px-3 py-2 text-[12px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <EyeOff className="h-3.5 w-3.5" /> Open Private
              </button>
              <button
                onClick={onCopy}
                className="flex items-center gap-1.5 rounded-lg border border-border/40 px-3 py-2 text-[12px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" /> Copy Link
              </button>
              {onReport && (
                <button
                  onClick={onReport}
                  className="flex items-center gap-1.5 rounded-lg border border-border/40 px-3 py-2 text-[12px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <Flag className="h-3.5 w-3.5" /> Report
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SecurityBadge({ assessment, onClick, compact = false }) {
  if (!assessment) return null;
  const level = assessment.level;
  const style = LEVEL_STYLES[level] || LEVEL_STYLES.unknown;
  const Icon = style.icon;
  const info = levelInfo(level);

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 rounded-full ${style.bg} px-1.5 py-0.5 text-[9px] font-semibold ${style.text} transition hover:opacity-80`}
        title={`${info.label} — risk ${assessment.risk}/100, confidence ${assessment.confidence}`}
      >
        <Icon className="h-2.5 w-2.5" />
        {level === "low" ? "✓" : level === "unknown" ? "?" : "!"}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full ${style.bg} px-2 py-0.5 text-[10px] font-semibold ${style.text} transition hover:opacity-80`}
      title={info.description}
    >
      <Icon className="h-3 w-3" />
      {info.label}
    </button>
  );
}

export { LEVEL_STYLES };