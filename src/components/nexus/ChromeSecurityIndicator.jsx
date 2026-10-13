import React, { useEffect, useMemo, useState } from "react";
import { Lock, ShieldAlert, ShieldCheck, Globe, Info, EyeOff } from "lucide-react";
import { analyzeUrl } from "./searchSecurity";

/**
 * ChromeSecurityIndicator — inline browser-chrome security cue.
 *
 * Lives in the omnibox and reflects the real, locally-computed risk of the
 * current URL. No separate dashboard, no fake counts — a small, honest badge
 * that opens a popover with the full breakdown when clicked.
 *
 * Levels mirror searchSecurity.js: low / guarded / suspicious / high / critical
 * plus the neutral HTTPS / HTTP / internal states.
 */
const LEVEL_META = {
  low: { label: "Secure", tone: "emerald", Icon: ShieldCheck },
  guarded: { label: "Secure", tone: "emerald", Icon: ShieldCheck },
  suspicious: { label: "Caution", tone: "amber", Icon: ShieldAlert },
  high: { label: "Not safe", tone: "orange", Icon: ShieldAlert },
  critical: { label: "Dangerous", tone: "rose", Icon: ShieldAlert },
  unknown: { label: "—", tone: "slate", Icon: Info },
};

const toneClasses = {
  emerald: "text-emerald-400 hover:text-emerald-300",
  amber: "text-amber-400 hover:text-amber-300",
  orange: "text-orange-400 hover:text-orange-300",
  rose: "text-rose-400 hover:text-rose-300",
  slate: "text-muted-foreground hover:text-foreground",
  violet: "text-violet-300 hover:text-violet-200",
};

export default function ChromeSecurityIndicator({ url, privateOn, onOpenSiteControls }) {
  const [open, setOpen] = useState(false);

  const analysis = useMemo(() => (url && url.startsWith("http") ? analyzeUrl(url) : null), [url]);
  const isInternal = url?.startsWith("nexus://");
  const isHttps = url?.startsWith("https://");
  const isHttp = url?.startsWith("http://");

  let meta, summary, Icon, tone;
  if (privateOn) {
    meta = { label: "Private", tone: "violet" };
    Icon = EyeOff;
    tone = "violet";
    summary = "Private session — Nexus-owned data stays separate and is cleared on close.";
  } else if (isInternal) {
    meta = { label: "Nexus", tone: "slate" };
    Icon = Globe;
    tone = "slate";
    summary = "This is an internal Nexus page.";
  } else if (!analysis || analysis.level === "unknown") {
    meta = isHttps
      ? { label: "Secure", tone: "emerald" }
      : { label: "Not secure", tone: "amber" };
    Icon = isHttps ? Lock : ShieldAlert;
    tone = isHttps ? "emerald" : "amber";
    summary = isHttps ? "Connection encrypted with HTTPS." : "No encryption — traffic can be observed.";
  } else {
    meta = LEVEL_META[analysis.level] || LEVEL_META.unknown;
    Icon = meta.Icon;
    tone = meta.tone;
    summary = analysis.summary;
  }

  // Close on URL change
  useEffect(() => { setOpen(false); }, [url]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); onOpenSiteControls?.(); }}
        className={`flex items-center gap-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium transition ${toneClasses[tone] || toneClasses.slate}`}
        aria-label={`Site security: ${meta.label}`}
        title={summary}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{meta.label}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="nx-reveal absolute left-0 top-10 z-50 w-80 overflow-hidden rounded-2xl border border-border/40 bg-popover shadow-2xl">
            {/* Header */}
            <div className="border-b border-border/30 p-3.5">
              <div className="flex items-center gap-2.5">
                <div className={`grid h-9 w-9 place-items-center rounded-xl bg-${tone}-500/15`}
                  style={{ color: `var(--${tone === "emerald" ? "emerald" : tone === "amber" ? "amber" : tone === "orange" ? "orange" : tone === "rose" ? "rose" : tone === "violet" ? "violet" : "muted"}-400, hsl(var(--muted-foreground)))` }}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-foreground">{meta.label}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {url?.replace(/^https?:\/\//, "")}
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-80 overflow-y-auto nexus-scroll p-3">
              <p className="text-[12px] leading-relaxed text-muted-foreground">{summary}</p>

              {analysis?.signals?.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {analysis.signals.length} signal{analysis.signals.length === 1 ? "" : "s"} detected
                  </div>
                  {analysis.signals.slice(0, 8).map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px]">
                      <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                        s.ok ? "bg-emerald-400" :
                        s.severity >= 3 ? "bg-rose-400" :
                        s.severity >= 2 ? "bg-amber-400" :
                        s.severity >= 1 ? "bg-sky-400" : "bg-muted-foreground/40"
                      }`} />
                      <div className="min-w-0">
                        <div className={`font-medium ${s.ok ? "text-emerald-300" : s.severity >= 3 ? "text-rose-300" : s.severity >= 2 ? "text-amber-300" : "text-foreground/80"}`}>
                          {s.label}
                        </div>
                        <div className="text-muted-foreground/70">{s.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {analysis?.recommendation && (
                <div className="mt-3 rounded-lg border border-border/30 bg-card/40 p-2.5 text-[11px] leading-relaxed text-muted-foreground/80">
                  {analysis.recommendation}
                </div>
              )}

              {privateOn && (
                <div className="mt-3 rounded-lg border border-violet-500/30 bg-violet-500/5 p-2.5 text-[11px] leading-relaxed text-violet-200/80">
                  You're in a private session. Nexus keeps private data separate and clears it on close, but sites, your ISP, and your employer can still see your activity.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}