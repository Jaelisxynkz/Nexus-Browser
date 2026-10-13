import React, { useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Eye, Shield, Cookie, Trash2, X, Fingerprint, Lock, Zap, Globe } from "lucide-react";
import {
  getSiteConfig, setSiteConfig, normalizeHost, forgetSite, PRIVACY_PROFILES, FINGERPRINT_MODES,
} from "./privacyEngine";
import { useToast } from "@/components/ui/use-toast";

/**
 * SiteProtection — the popover that opens when you click the lock/shield in the navbar.
 * Shows the effective posture for the current site and lets the user override it per-site.
 */
export default function SiteProtection({ url, onClose }) {
  const host = normalizeHost(url);
  const { toast } = useToast();

  const [site, setSite] = React.useState(() => getSiteConfig(host) || {});
  React.useEffect(() => { setSite(getSiteConfig(host) || {}); }, [host]);

  const save = useCallback((patch) => {
    const next = setSiteConfig(host, patch);
    setSite(next);
    toast({ title: `Saved rule for ${host}` });
  }, [host, toast]);

  const forget = useCallback(async () => {
    forgetSite(host);
    try {
      const hist = await base44.entities.HistoryEntry.filter({});
      const matches = hist.filter((e) => (e.url || "").includes(host));
      if (matches.length) await base44.entities.HistoryEntry.deleteMany({ id: { $in: matches.map((m) => m.id) } });
    } catch {}
    setSite({});
    toast({ title: `Forgot ${host}`, description: "Cleared Nexus-owned data for this site." });
    onClose?.();
  }, [host, onClose, toast]);

  return (
    <div className="absolute right-2 top-2 z-50 w-80 nx-reveal rounded-xl border border-border/50 bg-popover shadow-2xl" role="dialog" aria-label="Site protection">
      <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent" />
          <span className="text-[12px] font-semibold text-foreground">Site Protection</span>
        </div>
        <button onClick={onClose} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
      </div>

      <div className="px-4 py-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Current site</div>
        <div className="truncate text-[12px] font-medium text-foreground">{host || "Internal page"}</div>
      </div>

      <div className="px-4 pb-3">
        <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/60">Profile for this site</div>
        <div className="inline-flex w-full rounded-lg border border-border/40 bg-muted/40 p-0.5">
          {PRIVACY_PROFILES.map((p) => (
            <button
              key={p}
              onClick={() => save({ profile: p })}
              className={`flex-1 rounded-md px-1 py-1 text-[10px] font-medium capitalize transition ${site.profile === p ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/60">Fingerprinting</div>
        <div className="inline-flex w-full rounded-lg border border-border/40 bg-muted/40 p-0.5">
          {FINGERPRINT_MODES.map((m) => (
            <button
              key={m}
              onClick={() => save({ fingerprint: m })}
              className={`flex-1 rounded-md px-1 py-1 text-[10px] font-medium capitalize transition ${site.fingerprint === m ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-3 space-y-1.5">
        <label className="flex items-center justify-between text-[11px] text-foreground">
          <span className="flex items-center gap-1.5"><Cookie className="h-3.5 w-3.5 text-muted-foreground" /> Allow 3rd-party cookies</span>
          <button
            onClick={() => save({ cookies: !site.cookies })}
            className={`relative h-4 w-8 rounded-full transition ${site.cookies ? "bg-accent" : "bg-muted"}`}
          >
            <span className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition" style={{ left: site.cookies ? "14px" : "2px" }} />
          </button>
        </label>
        <div className="flex items-center justify-between text-[11px] text-foreground">
          <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-muted-foreground" /> Scripts</span>
          <select
            value={site.scripts || "inherit"}
            onChange={(e) => save({ scripts: e.target.value === "inherit" ? undefined : e.target.value })}
            className="rounded border border-border/40 bg-muted px-1.5 py-0.5 text-[10px] outline-none"
          >
            <option value="inherit">Inherit</option>
            <option value="allow">Allow</option>
            <option value="block">Block</option>
            <option value="strict">Strict</option>
          </select>
        </div>
      </div>

      <div className="border-t border-border/30 px-4 py-3">
        <button
          onClick={forget}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-destructive/90 py-2 text-[11px] font-medium text-destructive-foreground hover:bg-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" /> Forget This Site
        </button>
        <p className="mt-2 text-center text-[9px] text-muted-foreground/50">Clears Nexus-owned history, bookmarks & site rules. Server data unaffected.</p>
      </div>
    </div>
  );
}