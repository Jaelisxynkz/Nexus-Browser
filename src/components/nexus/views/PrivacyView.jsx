import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  ShieldCheck, Cookie, Eye, Lock, Fingerprint, Globe, Trash2, Zap, Gauge,
  AlertTriangle, ChevronDown, ChevronRight, ShieldOff, EyeOff, Network,
} from "lucide-react";
import {
  loadPrivacyConfig, savePrivacyConfig, PRIVACY_PROFILES, FINGERPRINT_MODES,
  HTTPS_MODES, REFERRER_MODES, loadSiteState, forgetSite, privacyScore,
} from "../privacyEngine";
import { useToast } from "@/components/ui/use-toast";

function Section({ title, desc, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-border/40 bg-card/40">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-foreground">{title}</div>
          {desc && <div className="text-[11px] text-muted-foreground/60">{desc}</div>}
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="border-t border-border/30 px-4 py-3">{children}</div>}
    </div>
  );
}

function Toggle({ on, onChange, label, desc }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2">
      <div>
        <div className="text-[12px] font-medium text-foreground">{label}</div>
        {desc && <div className="text-[10px] text-muted-foreground/60">{desc}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!on)}
        className={`relative h-5 w-9 rounded-full transition ${on ? "bg-accent" : "bg-muted"}`}
        role="switch" aria-checked={on}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${on ? "left-4.5" : "left-0.5"}`} style={{ left: on ? "18px" : "2px" }} />
      </button>
    </label>
  );
}

function Segmented({ value, options, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-border/40 bg-muted/40 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1 text-[11px] font-medium transition ${value === o.value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function PrivacyView() {
  const [cfg, setCfg] = useState(null);
  const [sites, setSites] = useState({});
  const { toast } = useToast();

  useEffect(() => {
    loadPrivacyConfig().then(setCfg);
    setSites(loadSiteState());
  }, []);

  const update = (patch) => {
    setCfg((prev) => ({ ...prev, ...patch }));
    savePrivacyConfig(patch);
  };

  const score = useMemo(() => (cfg ? privacyScore(cfg) : 0), [cfg]);

  if (!cfg) return <div className="px-6 py-10 text-[13px] text-muted-foreground">Loading privacy settings…</div>;

  const siteEntries = Object.entries(sites);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center gap-3 border-b border-border/40 pb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Privacy Center</h1>
          <p className="text-[12px] text-muted-foreground">Every control here maps to real Nexus behavior.</p>
        </div>
      </div>

      {/* Privacy score — based only on real config */}
      <div className="mt-5 rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Privacy Posture</div>
            <div className="mt-1 text-3xl font-bold text-foreground">{score}<span className="text-base text-muted-foreground">/100</span></div>
          </div>
          <div className="text-right text-[11px] text-muted-foreground/70 max-w-[260px]">
            Based only on the settings below. Higher scores mean stronger tracking resistance — never full anonymity.
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-to-r from-accent to-primary transition-all" style={{ width: `${score}%` }} />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <Section title="Privacy Profile" desc="A preset that bundles related protections." defaultOpen>
          <Segmented
            value={cfg.profile}
            onChange={(v) => update({ profile: v })}
            options={PRIVACY_PROFILES.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))}
          />
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/70">
            <b>Balanced</b> keeps sites working. <b>Strict</b> blocks more trackers. <b>Hardened</b> reduces fingerprint surface. <b>Maximum</b> may break some sites — it favors privacy over compatibility, not anonymity.
          </p>
        </Section>

        <Section title="Cookies & Storage" desc="Third-party cookies and site storage.">
          <Toggle on={!cfg.thirdPartyCookies} onChange={(v) => update({ thirdPartyCookies: !v })} label="Block third-party cookies" desc="Storage partitioning for first-party cookies is native-runtime only." />
        </Section>

        <Section title="Connection" desc="HTTPS and referrer policy.">
          <div className="flex items-center justify-between py-2">
            <span className="text-[12px] font-medium text-foreground">HTTPS-Only Mode</span>
            <Segmented
              value={cfg.httpsOnly}
              onChange={(v) => update({ httpsOnly: v })}
              options={HTTPS_MODES.map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) }))}
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[12px] font-medium text-foreground">Referrer Policy</span>
            <Segmented
              value={cfg.referrer}
              onChange={(v) => update({ referrer: v })}
              options={REFERRER_MODES.map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) }))}
            />
          </div>
          {cfg.httpsOnly === "strict" && (
            <p className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-400"><AlertTriangle className="h-3 w-3" /> Strict mode will not silently downgrade to HTTP — insecure sites show an interstitial.</p>
          )}
        </Section>

        <Section title="Fingerprinting Protection" desc="Reduces unnecessary identifying surface.">
          <Segmented
            value={cfg.fingerprint}
            onChange={(v) => update({ fingerprint: v })}
            options={FINGERPRINT_MODES.map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) }))}
          />
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/70">
            Nexus reduces exposure to known fingerprint surfaces (client hints, referrer, tracking params). It does not spoof fake hardware. Fingerprinting cannot be fully defeated — see the Fingerprint Protection center for details.
          </p>
        </Section>

        <Section title="Tracking & Content" desc="Query cleaning, popups, scripts.">
          <Toggle on={cfg.stripTrackingParams} onChange={(v) => update({ stripTrackingParams: v })} label="Strip tracking parameters" desc="Removes known marketing-attribution params from URLs." />
          <Toggle on={cfg.popupProtection} onChange={(v) => update({ popupProtection: v })} label="Popup protection" desc="Native runtime blocks popup chains; web build can't intercept window.open." />
          <div className="flex items-center justify-between py-2">
            <span className="text-[12px] font-medium text-foreground">Script control</span>
            <Segmented
              value={cfg.scriptControl}
              onChange={(v) => update({ scriptControl: v })}
              options={[{ value: "allow", label: "Allow" }, { value: "block", label: "Block" }, { value: "strict", label: "Strict" }]}
            />
          </div>
          {cfg.scriptControl !== "allow" && (
            <p className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-400"><AlertTriangle className="h-3 w-3" /> Blocking JavaScript breaks many sites. Per-site exceptions recommended.</p>
          )}
        </Section>

        <Section title="Privacy Signals" desc="GPC and DNT are preferences, not guarantees.">
          <Toggle on={cfg.gpc} onChange={(v) => update({ gpc: v })} label="Send Global Privacy Control" desc="A legally-recognized opt-out signal where jurisdictions support it." />
          <Toggle on={cfg.dnt} onChange={(v) => update({ dnt: v })} label="Send Do Not Track" desc="Non-binding request; sites may ignore it." />
        </Section>

        <Section title="Private Session" desc="What happens to private-mode data.">
          <Toggle on={cfg.clearPrivateOnClose} onChange={(v) => update({ clearPrivateOnClose: v })} label="Clear private data on last window close" desc="Wipes Nexus-owned private state. OS-level traces may persist." />
          <Toggle on={!cfg.incognitoOnStartup} onChange={(v) => update({ incognitoOnStartup: !v })} label="Never restore private tabs after restart" desc="Private sessions are never silently turned into normal tabs." />
          <div className="flex items-center justify-between py-2">
            <span className="text-[12px] font-medium text-foreground">Auto-clear after inactivity</span>
            <select
              value={cfg.clearPrivateAfterInactivity || 0}
              onChange={(e) => update({ clearPrivateAfterInactivity: Number(e.target.value) })}
              className="rounded-lg border border-border/40 bg-muted px-2 py-1 text-[11px] text-foreground outline-none"
            >
              <option value={0}>Off</option>
              <option value={5}>5 min</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>1 hour</option>
            </select>
          </div>
        </Section>

        <Section title="Site Exceptions" desc="Per-site overrides and Forget-after-closing.">
          {siteEntries.length === 0 ? (
            <p className="text-[12px] text-muted-foreground/60">No per-site rules. Use the Site Protection panel on any page to add one.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {siteEntries.map(([host, rule]) => (
                <div key={host} className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/30 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] text-foreground">{host}</div>
                    <div className="text-[10px] text-muted-foreground/60">
                      {rule.profile ? `Profile: ${rule.profile}` : ""} {rule.cookies !== undefined ? `· Cookies: ${rule.cookies ? "allow" : "block"}` : ""} {rule.scripts ? `· Scripts: ${rule.scripts}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => { forgetSite(host); setSites(loadSiteState()); toast({ title: `Forgot ${host}` }); }}
                    className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                    title="Forget this site"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Forget This Site" desc="Clear Nexus-owned data for a specific site.">
          <ForgetSiteControl onDone={() => { setSites(loadSiteState()); }} />
        </Section>

        <Section title="Telemetry & Diagnostics" desc="Nexus ships with telemetry off by default.">
          <Toggle on={!cfg.telemetry} onChange={(v) => update({ telemetry: !v })} label="Keep telemetry off" desc="Diagnostics stay local unless you explicitly share them." />
        </Section>
      </div>
    </div>
  );
}

function ForgetSiteControl({ onDone }) {
  const [host, setHost] = useState("");
  const { toast } = useToast();
  const forget = async () => {
    if (!host.trim()) return;
    const h = host.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    // History entries for this host
    try {
      const hist = await base44.entities.HistoryEntry.filter({});
      const matches = hist.filter((e) => (e.url || "").includes(h));
      await base44.entities.HistoryEntry.deleteMany({ id: { $in: matches.map((m) => m.id) } });
      // Bookmarks for this host
      const bms = await base44.entities.Bookmark.filter({});
      const bmMatches = bms.filter((b) => (b.url || "").includes(h));
      await base44.entities.Bookmark.deleteMany({ id: { $in: bmMatches.map((m) => m.id) } });
      // Per-site privacy state
      forgetSite(h);
      toast({ title: `Forgot ${h}`, description: `Cleared ${matches.length} history + ${bmMatches.length} bookmarks. Cookies/cache need native runtime.` });
      onDone?.();
    } catch {
      toast({ title: "Couldn't forget site", variant: "destructive" });
    }
    setHost("");
  };
  return (
    <div className="flex items-center gap-2">
      <input
        value={host}
        onChange={(e) => setHost(e.target.value)}
        placeholder="example.com"
        className="flex-1 rounded-lg border border-border/40 bg-muted px-3 py-1.5 text-[12px] outline-none placeholder:text-muted-foreground/50"
      />
      <button onClick={forget} className="rounded-lg bg-destructive/90 px-3 py-1.5 text-[12px] font-medium text-destructive-foreground hover:bg-destructive">Forget</button>
    </div>
  );
}