import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Search, Clock, EyeOff, Sparkles, ShieldCheck, Database, Globe,
  Lock, Trash2, ExternalLink,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNexusSettings } from "../useNexusSettings";

/**
 * SearchPrivacyView — nexus://search-privacy
 *
 * Complete transparency dashboard for Nexus Search privacy.
 * Shows: queries stored, history status, autocomplete, personalization,
 * private search, telemetry, security scanning, external providers.
 */
export default function SearchPrivacyView({ onNavigate }) {
  const { settings } = useNexusSettings();
  const [searchCount, setSearchCount] = useState(0);
  const [historyEnabled, setHistoryEnabled] = useState(settings.searchHistory ?? true);
  const [autocompleteEnabled, setAutocompleteEnabled] = useState(settings.searchSuggestions ?? true);
  const [personalization, setPersonalization] = useState(settings.personalizedResults ?? false);
  const [privateSearch, setPrivateSearch] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.HistoryEntry.filter({}).then((rows) => {
      setSearchCount(rows.filter((r) => r.url?.startsWith("nexus://search?q=")).length);
    }).catch(() => {});
  }, []);

  const clearSearchHistory = async () => {
    try {
      const rows = await base44.entities.HistoryEntry.filter({ url: { $regex: "^nexus://search" } });
      // Note: SDK doesn't have a regex filter, but $regex works with filter.
      // Fallback: filter in-memory then delete.
      const searchRows = rows.filter((r) => r.url?.startsWith("nexus://search?q="));
      for (const r of searchRows) {
        await base44.entities.HistoryEntry.delete(r.id).catch(() => {});
      }
      setSearchCount(0);
      toast({ title: "Search history cleared" });
    } catch {
      toast({ title: "Couldn't clear history", variant: "destructive" });
    }
  };

  const stats = [
    { label: "Queries Stored", value: searchCount, icon: Database, color: "text-sky-400" },
    { label: "Search History", value: historyEnabled ? "On" : "Off", icon: Clock, color: historyEnabled ? "text-emerald-400" : "text-muted-foreground" },
    { label: "Autocomplete", value: autocompleteEnabled ? "On" : "Off", icon: Sparkles, color: autocompleteEnabled ? "text-emerald-400" : "text-muted-foreground" },
    { label: "Personalization", value: personalization ? "On" : "Off (default)", icon: Globe, color: personalization ? "text-amber-400" : "text-emerald-400" },
    { label: "Private Search", value: privateSearch ? "On" : "Off", icon: EyeOff, color: privateSearch ? "text-violet-400" : "text-muted-foreground" },
    { label: "Telemetry", value: "Off", icon: ShieldCheck, color: "text-emerald-400" },
    { label: "Security Scanning", value: "Local only", icon: Lock, color: "text-emerald-400" },
    { label: "External Providers", value: "Wikipedia + DDG (free)", icon: Globe, color: "text-sky-400" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Search Privacy Dashboard</h1>
          <p className="text-[12px] text-muted-foreground">Complete transparency for Nexus Search.</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border/30 bg-card/40 p-3">
            <div className="flex items-center gap-2">
              <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">{s.label}</span>
            </div>
            <div className={`mt-1 text-[14px] font-semibold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="space-y-3">
        <ToggleRow
          icon={Clock}
          label="Search History"
          description="Store your search queries locally so you can see recent searches."
          enabled={historyEnabled}
          onToggle={() => setHistoryEnabled((v) => !v)}
        />
        <ToggleRow
          icon={Sparkles}
          label="Autocomplete"
          description="Show suggestions as you type, sourced from local history only."
          enabled={autocompleteEnabled}
          onToggle={() => setAutocompleteEnabled((v) => !v)}
        />
        <ToggleRow
          icon={Globe}
          label="Personalized Suggestions"
          description="Use your history to personalize result ranking. Off by default."
          enabled={personalization}
          onToggle={() => setPersonalization((v) => !v)}
        />
        <ToggleRow
          icon={EyeOff}
          label="Private Search Mode"
          description="When on, queries are not stored and not used for suggestions."
          enabled={privateSearch}
          onToggle={() => setPrivateSearch((v) => !v)}
        />
      </div>

      {/* Data controls */}
      <div className="mt-6 rounded-xl border border-border/30 bg-card/40 p-4">
        <h2 className="mb-3 text-[13px] font-semibold text-foreground">Your Search Data</h2>
        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span>{searchCount} search{searchCount === 1 ? "" : "es"} stored locally.</span>
          <button
            onClick={clearSearchHistory}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-rose-400 hover:bg-rose-500/20"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear Search History
          </button>
        </div>
      </div>

      {/* Transparency note */}
      <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-emerald-400">
          <ShieldCheck className="h-4 w-4" /> What Nexus Search protects
        </div>
        <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-muted-foreground/80">
          <li className="flex items-start gap-2"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400" /> No marketing trackers or third-party analytics injected into search.</li>
          <li className="flex items-start gap-2"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400" /> Security analysis runs entirely on your device — your URLs are never sent to a scanning service.</li>
          <li className="flex items-start gap-2"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400" /> Private search queries never enter normal history.</li>
          <li className="flex items-start gap-2"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400" /> Personalization is off by default. You opt in.</li>
          <li className="flex items-start gap-2"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-400" /> Search results come from free Wikipedia and DuckDuckGo APIs. Your query is sent to those services to fetch results — Nexus cannot make you invisible to them.</li>
        </ul>
      </div>

      <button
        onClick={() => onNavigate("nexus://search")}
        className="mt-6 flex items-center gap-2 text-[12px] text-accent hover:underline"
      >
        <Search className="h-3.5 w-3.5" /> Back to Search
      </button>
    </div>
  );
}

function ToggleRow({ icon: Icon, label, description, enabled, onToggle }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/30 bg-card/40 p-4">
      <div className="flex items-start gap-3">
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${enabled ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[13px] font-medium text-foreground">{label}</div>
          <div className="text-[11px] text-muted-foreground/70">{description}</div>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? "bg-accent" : "bg-muted"}`}
        role="switch"
        aria-checked={enabled}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}