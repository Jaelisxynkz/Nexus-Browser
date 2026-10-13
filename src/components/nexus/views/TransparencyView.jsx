import React, { useEffect, useState } from "react";
import { Eye, Wifi, Server, Shield, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { loadPrivacyConfig, loadSecurityConfig } from "../privacyEngine";

/**
 * Nexus Transparency — what the browser actually does behind the scenes.
 * No hidden behavior. Lists every external connection Nexus makes and
 * which features require external services.
 */
const SERVICES = [
  { name: "Nexus Search", external: true, note: "Queries go to the configured search provider (Nexus backend function)." },
  { name: "Nexus AI Assistant", external: true, note: "Prompts sent to the assistant backend function (LLM provider)." },
  { name: "Update checks", external: true, note: "Release metadata fetched from the Nexus releases backend function." },
  { name: "Account / auth", external: true, note: "Tokens issued by the Base44 auth backend." },
  { name: "Data sync (bookmarks/history/settings)", external: true, note: "Stored in your Base44 app database, scoped to your account via RLS." },
  { name: "Telemetry", external: false, note: "Off by default. Never silently enabled." },
  { name: "Crash reports", external: false, note: "Stay local unless you explicitly share." },
  { name: "Crash-recovery heartbeat", external: false, note: "Writes to local storage only; no network." },
  { name: "Favicon fetches", external: true, note: "Favicons loaded from each site's own server via Google's favicon service." },
];

export default function TransparencyView() {
  const [privacy, setPrivacy] = useState(null);
  const [security, setSecurity] = useState(null);

  useEffect(() => {
    loadPrivacyConfig().then(setPrivacy);
    loadSecurityConfig().then(setSecurity);
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center gap-3 border-b border-border/40 pb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent"><Eye className="h-5 w-5" /></div>
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Nexus Transparency</h1>
          <p className="text-[12px] text-muted-foreground">Every connection Nexus makes, honestly listed.</p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-border/40">
        {SERVICES.map((s, i) => (
          <div key={s.name} className={`flex items-start gap-3 px-4 py-3 ${i % 2 === 0 ? "bg-card/30" : "bg-card/10"}`}>
            <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${s.external ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
              {s.external ? <Wifi className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-foreground">{s.name}</span>
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${s.external ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                  {s.external ? "Leaves browser" : "Stays local"}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground/70">{s.note}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-border/40 bg-card/40 p-4">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground"><Shield className="h-4 w-4 text-accent" /> Active Privacy Signals</div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          {privacy?.gpc && <span className="rounded-lg bg-accent/15 px-2.5 py-1 text-accent">Global Privacy Control</span>}
          {privacy?.dnt && <span className="rounded-lg bg-accent/15 px-2.5 py-1 text-accent">Do Not Track</span>}
          <span className="rounded-lg bg-muted px-2.5 py-1 text-muted-foreground">HTTPS: {privacy?.httpsOnly}</span>
          <span className="rounded-lg bg-muted px-2.5 py-1 text-muted-foreground">Profile: {privacy?.profile}</span>
          <span className="rounded-lg bg-muted px-2.5 py-1 text-muted-foreground">Security: {security?.level}</span>
          <span className={`rounded-lg px-2.5 py-1 ${privacy?.telemetry ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400"}`}>
            Telemetry: {privacy?.telemetry ? "On" : "Off"}
          </span>
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground/60">
          GPC and DNT are preference signals. Sites are not required to honor them.
        </p>
      </div>
    </div>
  );
}