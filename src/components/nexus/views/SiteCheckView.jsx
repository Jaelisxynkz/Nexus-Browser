import React, { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck, RefreshCw, ArrowLeft, Copy, ExternalLink, EyeOff,
  CheckCircle2, AlertTriangle, AlertOctagon, Info, ChevronRight,
} from "lucide-react";
import { analyzeUrlCached, levelInfo } from "../searchSecurity";
import { LEVEL_STYLES, SecurityBadge } from "../SecurityWarning";
import { faviconFor } from "../useBrowser";
import { useToast } from "@/components/ui/use-toast";

/**
 * SiteCheckView — the nexus://site-check details page.
 *
 * Full security breakdown for a URL: risk, confidence, every signal,
 * potential risks, recommendations, and honest disclaimers.
 */
export default function SiteCheckView({ url, query, onNavigate, onBack }) {
  const [assessment, setAssessment] = useState(null);
  const [scanning, setScanning] = useState(false);
  const { toast } = useToast();

  const runScan = useCallback((force = false) => {
    if (!url) return;
    setScanning(true);
    // Local analysis is synchronous; small delay for UX clarity.
    setTimeout(() => {
      const result = analyzeUrlCached(url, query, force);
      setAssessment(result);
      setScanning(false);
    }, 150);
  }, [url, query]);

  useEffect(() => { runScan(); }, [runScan]);

  if (!url) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <h1 className="mt-3 text-lg font-semibold text-foreground">No URL to analyze</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Use "Check Safety" on a search result to inspect a site here.</p>
      </div>
    );
  }

  const level = assessment?.level || "unknown";
  const info = levelInfo(level);
  const style = LEVEL_STYLES[level] || LEVEL_STYLES.unknown;
  const Icon = style.icon;
  const signals = (assessment?.signals || []).filter((s) => !s.ok);
  const positive = (assessment?.signals || []).filter((s) => s.ok);
  const domain = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } })();

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-4 flex items-center gap-2">
        {onBack && (
          <button onClick={onBack} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <h1 className="text-xl font-bold font-display text-foreground">Site Security Check</h1>
      </div>

      {/* URL header */}
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 p-3">
        <img src={faviconFor(url)} alt="" className="h-8 w-8 rounded-md" onError={(e) => (e.currentTarget.style.display = "none")} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-foreground">{domain || url}</div>
          <div className="truncate font-mono text-[10px] text-muted-foreground">{url}</div>
        </div>
        <button onClick={() => { navigator.clipboard?.writeText(url); toast({ title: "URL copied" }); }} className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Score card */}
      <div className={`mb-5 rounded-2xl border ${style.ring} ${style.bg} p-5`}>
        <div className="flex items-center gap-3">
          <Icon className={`h-8 w-8 ${style.text}`} />
          <div className="flex-1">
            <div className={`text-lg font-bold ${style.text}`}>{info.label}</div>
            <div className="text-[12px] text-muted-foreground">{info.description}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/60">Risk</div>
            <div className={`text-2xl font-bold ${style.text}`}>{assessment?.risk ?? 0}<span className="text-[12px] text-muted-foreground">/100</span></div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/60">Confidence</div>
            <div className={`text-[14px] font-semibold capitalize ${style.text}`}>{assessment?.confidence || "low"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/60">Checked</div>
            <div className="text-[12px] text-muted-foreground">{assessment?.fromCache ? `${Math.round((Date.now() - (assessment?.scannedAt || Date.now())) / 60000)}m ago` : "just now"}</div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={() => runScan(true)} disabled={scanning} className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-background/40 px-3 py-1.5 text-[12px] text-foreground hover:bg-muted disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${scanning ? "animate-spin" : ""}`} /> Re-check
          </button>
          <button onClick={() => onNavigate?.(url)} className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-background/40 px-3 py-1.5 text-[12px] text-foreground hover:bg-muted">
            <ExternalLink className="h-3.5 w-3.5" /> Open
          </button>
          <button onClick={() => onNavigate?.("nexus://incognito")} className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-background/40 px-3 py-1.5 text-[12px] text-foreground hover:bg-muted">
            <EyeOff className="h-3.5 w-3.5" /> Private
          </button>
        </div>
      </div>

      {/* Detected signals */}
      {signals.length > 0 && (
        <div className="mb-5">
          <h2 className="mb-2 text-[13px] font-semibold text-foreground">Potential Risks ({signals.length})</h2>
          <div className="space-y-2">
            {signals.map((s) => (
              <div key={s.id} className="flex items-start gap-2.5 rounded-lg border border-border/30 bg-card/40 p-3">
                {s.severity >= 4 ? <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  : s.severity >= 3 ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                  : s.severity >= 2 ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  : <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />}
                <div>
                  <div className="text-[13px] font-medium text-foreground">{s.label}</div>
                  <div className="text-[11px] leading-relaxed text-muted-foreground/80">{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Positive signals */}
      {positive.length > 0 && (
        <div className="mb-5">
          <h2 className="mb-2 text-[13px] font-semibold text-foreground">Positive Signals ({positive.length})</h2>
          <div className="space-y-2">
            {positive.map((s) => (
              <div key={s.id} className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div>
                  <div className="text-[13px] font-medium text-foreground">{s.label}</div>
                  <div className="text-[11px] leading-relaxed text-muted-foreground/80">{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation */}
      <div className="mb-5 rounded-lg border border-border/40 bg-card/60 p-4">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground/60">Recommended Action</div>
        <div className="mt-1 text-[13px] leading-relaxed text-foreground/90">{assessment?.recommendation}</div>
      </div>

      {/* Honest disclaimer */}
      <div className="rounded-lg border border-border/30 bg-muted/20 p-3 text-[11px] leading-relaxed text-muted-foreground/70">
        <b className="text-foreground">What Nexus checked:</b> URL structure, protocol, domain characteristics, encoding, redirect tricks, homograph patterns, download extensions, and known-domain reputation — all locally, without sending your data anywhere.
        <div className="mt-2"><b className="text-foreground">What this is not:</b> a malware scan, certificate inspection, or threat-intelligence lookup. "No major warning signals" does not mean a site is safe. Deep page scan requires the Nexus native browser runtime.</div>
      </div>

      {/* Scan history note */}
      <div className="mt-3 text-center text-[10px] text-muted-foreground/40">
        Analysis is cached locally for 15 minutes. Use Re-check for a fresh assessment.
      </div>
    </div>
  );
}