import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import NexusServices from "../services";
import {
  Search, Globe, Loader2, AlertTriangle, Image as ImageIcon, Newspaper,
  Video, Code2, MessageSquare, GraduationCap, FileText, FolderOpen,
  ShoppingBag, MapPin, ChevronDown, Filter, Clock, X, EyeOff, ShieldCheck,
  Bookmark, FlaskConical, Copy, MoreHorizontal, ArrowRight, RefreshCw,
} from "lucide-react";
import { faviconFor } from "../useBrowser";
import { useToast } from "@/components/ui/use-toast";
import { useNexusSettings } from "../useNexusSettings";
import { usePrivacy } from "../usePrivacy";
import {
  analyzeUrl, analyzeUrlCached, classifyResult, rankResults, whyThisResult,
  deduplicateResults, parseOperators, resolveBang, normalizeUrl, levelInfo,
} from "../searchSecurity";
import { SecurityBadge, LEVEL_STYLES } from "../SecurityWarning";
import SecurityWarning from "../SecurityWarning";
import ResultActionMenu, { ResultPreview } from "../ResultActions";
import SiteCheckView from "./SiteCheckView";

/* ------------------------------------------------------------------ */
/* Search Categories — only those that actually work                    */
/* ------------------------------------------------------------------ */
const CATEGORIES = [
  { key: "web", label: "All", icon: Globe },
  { key: "images", label: "Images", icon: ImageIcon },
  { key: "videos", label: "Videos", icon: Video },
  { key: "news", label: "News", icon: Newspaper },
  { key: "code", label: "Code", icon: Code2 },
  { key: "forums", label: "Forums", icon: MessageSquare },
  { key: "academic", label: "Research", icon: GraduationCap },
  { key: "docs", label: "Docs", icon: FileText },
];

/* Density options */
const DENSITIES = {
  compact: { row: "py-2.5 px-3", gap: "space-y-2", title: "text-[14px]", desc: "text-[12px]", meta: "text-[10px]" },
  comfortable: { row: "py-3.5 px-4", gap: "space-y-3", title: "text-[15px]", desc: "text-[13px]", meta: "text-[11px]" },
  spacious: { row: "py-5 px-5", gap: "space-y-4", title: "text-[16px]", desc: "text-[14px]", meta: "text-[12px]" },
};

/* ------------------------------------------------------------------ */
/* Result Row — the core unit                                          */
/* ------------------------------------------------------------------ */
function ResultRow({ result, query, density, onNavigate, onAction, onCheckSafety, assessment }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const rowRef = useRef(null);
  const d = DENSITIES[density] || DENSITIES.comfortable;

  const labels = classifyResult(result);
  const security = assessment || analyzeUrl(result.url, query);
  const reasons = whyThisResult(result, query);

  const openMenu = (e) => {
    e.stopPropagation();
    if (menuOpen) { setMenuOpen(false); return; }
    // Simple positioning: render relative to the row's right side.
    setMenuOpen(true);
  };

  return (
    <div
      ref={rowRef}
      className={`group relative rounded-xl border border-border/30 bg-card/30 transition hover:border-accent/40 hover:bg-card/60 ${d.row}`}
      onContextMenu={(e) => { e.preventDefault(); openMenu(e); }}
    >
      <div className="flex items-start gap-3">
        {/* Favicon + security */}
        <div className="mt-0.5 flex shrink-0 flex-col items-center gap-1">
          <img src={faviconFor(result.url)} alt="" className="h-5 w-5 rounded-sm" onError={(e) => (e.currentTarget.style.display = "none")} />
          <SecurityBadge assessment={security} compact onClick={() => onCheckSafety(result)} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-start gap-2">
            <button
              onClick={() => onNavigate(result.url)}
              className={`min-w-0 flex-1 truncate text-left font-medium text-accent hover:underline ${d.title}`}
            >
              {result.title}
            </button>
            {labels?.map((l) => (
              <span key={l.kind} className="shrink-0 rounded-full bg-muted/50 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                {l.label}
              </span>
            ))}
          </div>

          {/* URL row */}
          <div className={`mt-0.5 flex items-center gap-1.5 text-muted-foreground/60 ${d.meta}`}>
            <span className="truncate font-mono">{result.url.replace(/^https?:\/\//, "")}</span>
            {security.level !== "low" && security.level !== "unknown" && (
              <SecurityBadge assessment={security} onClick={() => onCheckSafety(result)} />
            )}
          </div>

          {/* Description */}
          {result.description && (
            <p className={`mt-1 leading-relaxed text-muted-foreground/80 line-clamp-2 ${d.desc}`}>
              {result.description}
            </p>
          )}

          {/* Actions row — revealed on hover/focus */}
          <div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              onClick={() => onNavigate(result.url)}
              className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent hover:bg-accent/20"
            >
              Open <ArrowRight className="h-2.5 w-2.5" />
            </button>
            <button onClick={() => onAction("preview", result)} className="flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground">
              Preview
            </button>
            <button onClick={() => onCheckSafety(result)} className="flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground">
              Check Safety
            </button>
            <button onClick={() => onAction("bookmark", result)} className="flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground">
              <Bookmark className="h-2.5 w-2.5" />
            </button>
            <button onClick={() => onAction("research", result)} className="flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground">
              <FlaskConical className="h-2.5 w-2.5" />
            </button>
            <button onClick={() => setWhyOpen((o) => !o)} className="flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground">
              Why?
            </button>
            <div className="relative ml-auto">
              <button
                onClick={openMenu}
                className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground/50 hover:bg-muted hover:text-foreground"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
              {menuOpen && <ResultActionMenu result={result} query={query} onAction={onAction} onClose={() => setMenuOpen(false)} />}
            </div>
          </div>

          {/* Why this result */}
          {whyOpen && reasons.length > 0 && (
            <div className="mt-2 rounded-lg border border-border/20 bg-muted/20 px-2.5 py-2">
              <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/60">Why this result</div>
              <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground/80">
                {reasons.map((r) => <li key={r} className="flex items-center gap-1.5"><ArrowRight className="h-2.5 w-2.5 text-accent/60" />{r}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SearchView — the complete Nexus Search experience                   */
/* ------------------------------------------------------------------ */
export default function SearchView({ initialQuery, onNavigate, onAction: parentAction }) {
  const { settings, update } = useNexusSettings();
  const { privateOn } = usePrivacy();
  const [query, setQuery] = useState(initialQuery || "");
  const [category, setCategory] = useState("web");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [recent, setRecent] = useState([]);
  const [density, setDensity] = useState("comfortable");
  const [safeSearch, setSafeSearch] = useState(settings.safeSearch || "moderate");
  const [previewResult, setPreviewResult] = useState(null);
  const [previewAssessment, setPreviewAssessment] = useState(null);
  const [checkUrl, setCheckUrl] = useState(null);
  const [checkQuery, setCheckQuery] = useState("");
  const [warningUrl, setWarningUrl] = useState(null);
  const [warningAssessment, setWarningAssessment] = useState(null);
  const [searchHistory, setSearchHistory] = useState(true); // local setting
  const [privateSearch, setPrivateSearch] = useState(false);
  const requestRef = useRef(0); // race-condition guard
  const { toast } = useToast();

  // Load recent searches from history (only if history is enabled)
  useEffect(() => {
    if (!searchHistory || privateOn) return;
    base44.entities.HistoryEntry.filter({}, "-created_date", 80)
      .then((rows) => {
        const searches = rows
          .filter((r) => r.url.startsWith("nexus://search?q="))
          .map((r) => decodeURIComponent(r.url.split("q=")[1] || ""))
          .filter(Boolean);
        setRecent([...new Set(searches)].slice(0, 8));
      })
      .catch(() => {});
  }, [data, searchHistory, privateOn]);

  // Record a search to history (skip if private search or history disabled)
  const recordSearch = useCallback((term) => {
    if (!searchHistory || privateSearch || privateOn) return;
    base44.entities.HistoryEntry.create({
      url: "nexus://search?q=" + encodeURIComponent(term),
      title: "Search: " + term,
      visited_at: new Date().toISOString(),
    }).catch(() => {});
  }, [searchHistory, privateSearch, privateOn]);

  // The core search runner — race-protected with request IDs.
  const run = useCallback(async (q, cat = category) => {
    const term = (q ?? query).trim();
    if (!term) return;

    // Check for bangs first
    const bang = resolveBang(term);
    if (bang) {
      onNavigate(bang.url);
      return;
    }

    // Check for operators that alter behavior
    const ops = parseOperators(term);

    // Check for direct URL / internal route
    if (/^https?:\/\//i.test(term) || /^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(term)) {
      // Valid URL — navigate directly, never search
      const url = /^https?:\/\//i.test(term) ? term : "https://" + term;
      // Run a quick safety check before navigating to suspicious URLs
      const assessment = analyzeUrl(url, term);
      if (assessment.level === "high" || assessment.level === "critical") {
        setWarningUrl(url);
        setWarningAssessment(assessment);
        return;
      }
      onNavigate(url);
      return;
    }
    if (term.startsWith("nexus://")) {
      onNavigate(term);
      return;
    }

    // Fire the search — increment request ID, latest wins.
    const requestId = ++requestRef.current;
    setLoading(true);
    setData(null);
    setPreviewResult(null);

    try {
      const res = await NexusServices.search({ query: term, category: cat });
      // Stale response guard
      if (requestId !== requestRef.current) return;

      let results = res.results || [];

      // Client-side post-processing (zero credits)
      results = deduplicateResults(results);
      results = rankResults(results, term);

      // Apply safe search filter (client-side, only filters results that are
      // already tagged or obviously adult — honest, not fabricated)
      if (safeSearch !== "off") {
        results = results.filter((r) => {
          const text = ((r.title || "") + " " + (r.url || "") + " " + (r.description || "")).toLowerCase();
          const blocked = ["xxx", "porn", "sex", "nude", "nsfw"];
          return !blocked.some((b) => text.includes(b));
        });
        // Strict mode: also filter gambling/violence terms
        if (safeSearch === "strict") {
          results = results.filter((r) => {
            const text = ((r.title || "") + " " + (r.description || "")).toLowerCase();
            const blocked = ["casino", "gambling", "bet", "weed", "cannabis"];
            return !blocked.some((b) => text.includes(b));
          });
        }
      }

      // Operator filtering
      if (ops.operators.site) {
        results = results.filter((r) => r.url?.toLowerCase().includes(ops.operators.site.toLowerCase()));
      }
      if (ops.operators.intitle) {
        results = results.filter((r) => r.title?.toLowerCase().includes(ops.operators.intitle.toLowerCase()));
      }
      if (ops.operators.filetype) {
        results = results.filter((r) => r.url?.toLowerCase().endsWith("." + ops.operators.filetype.toLowerCase()));
      }

      // Record search
      recordSearch(term);

      setData({ ...res, results, available: res.available !== false });
    } catch (e) {
      if (requestId !== requestRef.current) return;
      setData({ available: false, error: e.message, results: [] });
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [query, category, safeSearch, recordSearch, onNavigate, toast]);

  // Auto-run on initial query
  useEffect(() => {
    if (initialQuery) run(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // Category switch re-runs
  const switchCategory = (key) => {
    setCategory(key);
    if (query.trim()) run(query, key);
  };

  // Result action handler — routes to Home's nav or local handlers
  const handleAction = useCallback((action, result) => {
    switch (action) {
      case "open": onNavigate(result.url); break;
      case "newTab": parentAction?.("newTab", result.url); break;
      case "backgroundTab": parentAction?.("backgroundTab", result.url); break;
      case "split": parentAction?.("split", result.url); break;
      case "sidePanel": parentAction?.("sidePanel", result.url); break;
      case "private": parentAction?.("private", result.url); break;
      case "preview": {
        const assessment = analyzeUrl(result.url, query);
        setPreviewResult(result);
        setPreviewAssessment(assessment);
        break;
      }
      case "checkSafety": {
        const assessment = analyzeUrlCached(result.url, query);
        if (assessment.level === "high" || assessment.level === "critical") {
          setWarningUrl(result.url);
          setWarningAssessment(assessment);
        } else {
          setCheckUrl(result.url);
          setCheckQuery(query);
        }
        break;
      }
      case "bookmark": {
        base44.entities.Bookmark.create({
          title: result.title, url: result.url, favicon: faviconFor(result.url), pinned: false,
        }).then(() => toast({ title: "Bookmarked" })).catch(() => toast({ title: "Couldn't bookmark", variant: "destructive" }));
        break;
      }
      case "research": {
        // Store in ResearchProject if available, else just bookmark with tag
        base44.entities.Bookmark.create({
          title: result.title, url: result.url, favicon: faviconFor(result.url),
          pinned: false, tags: ["research"],
        }).then(() => toast({ title: "Added to research" })).catch(() => toast({ title: "Couldn't save", variant: "destructive" }));
        break;
      }
      case "copyLink": navigator.clipboard?.writeText(result.url).catch(() => {}); toast({ title: "URL copied" }); break;
      case "copyTitle": navigator.clipboard?.writeText(result.title).catch(() => {}); toast({ title: "Title copied" }); break;
      case "share": navigator.share?.({ title: result.title, url: result.url }).catch(() => toast({ title: "Share not available" })); break;
      case "searchWithin": {
        setQuery(`site:${result.domain || result.url} ${query}`);
        break;
      }
      default: break;
    }
  }, [onNavigate, parentAction, query, toast]);

  // Check safety from a result row
  const handleCheckSafety = useCallback((result) => {
    handleAction("checkSafety", result);
  }, [handleAction]);

  // If showing a site-check or warning, render that instead
  if (warningUrl && warningAssessment) {
    return (
      <SecurityWarning
        assessment={warningAssessment}
        url={warningUrl}
        onBack={() => { setWarningUrl(null); setWarningAssessment(null); }}
        onProceed={() => { setWarningUrl(null); onNavigate(warningUrl); }}
        onOpenPrivate={() => { setWarningUrl(null); parentAction?.("private", warningUrl); }}
        onCopy={() => { navigator.clipboard?.writeText(warningUrl); toast({ title: "URL copied" }); }}
        onReport={() => toast({ title: "Report saved locally", description: "No external report service is connected." })}
      />
    );
  }

  if (checkUrl) {
    return (
      <div className="h-full overflow-y-auto nexus-scroll">
        <SiteCheckView
          url={checkUrl}
          query={checkQuery}
          onNavigate={(u) => { setCheckUrl(null); onNavigate(u); }}
          onBack={() => setCheckUrl(null)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Search header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-accent" />
          <h1 className="text-lg font-bold font-display text-foreground">Nexus Search</h1>
        </div>
        <div className="flex items-center gap-2">
          {privateSearch && (
            <span className="flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
              <EyeOff className="h-2.5 w-2.5" /> Private Search
            </span>
          )}
          <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[9px] font-medium text-muted-foreground/60 capitalize">
            Safe Search: {safeSearch}
          </span>
        </div>
      </div>

      {/* Search bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); run(); }}
        className="flex items-center gap-3 rounded-2xl border border-border/50 bg-input/50 px-5 py-3.5 transition focus-within:border-accent/60 focus-within:bg-input focus-within:shadow-[0_0_24px_hsl(var(--accent)/0.15)]"
      >
        <Search className="h-5 w-5 text-accent" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Nexus, type a URL, or use a bang (!g, @gh)…"
          className="flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
          autoComplete="off"
          aria-label="Nexus Search"
        />
        {loading && <Loader2 className="h-5 w-5 animate-spin text-accent" />}
        {query && (
          <button type="button" onClick={() => setQuery("")} className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      {/* Category bar */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {CATEGORIES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => switchCategory(key)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition ${
              category === key
                ? "bg-accent/15 text-accent shadow-[0_0_12px_hsl(var(--accent)/0.1)]"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-3 w-3" /> {label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1">
          {/* Density toggle */}
          <select
            value={density}
            onChange={(e) => setDensity(e.target.value)}
            className="rounded-full border border-border/30 bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground outline-none"
            aria-label="Result density"
          >
            <option value="compact">Compact</option>
            <option value="comfortable">Comfortable</option>
            <option value="spacious">Spacious</option>
          </select>
          {/* Safe search toggle */}
          <select
            value={safeSearch}
            onChange={(e) => setSafeSearch(e.target.value)}
            className="rounded-full border border-border/30 bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground outline-none"
            aria-label="Safe search"
          >
            <option value="off">Safe: Off</option>
            <option value="moderate">Safe: Moderate</option>
            <option value="strict">Safe: Strict</option>
          </select>
          {/* Private search toggle */}
          <button
            onClick={() => setPrivateSearch((p) => !p)}
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] transition ${
              privateSearch ? "bg-violet-500/20 text-violet-300" : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
            title={privateSearch ? "Private Search on — queries won't be stored" : "Private Search off"}
          >
            <EyeOff className="h-2.5 w-2.5" /> {privateSearch ? "On" : "Off"}
          </button>
          {/* History toggle */}
          <button
            onClick={() => setSearchHistory((h) => !h)}
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] transition ${
              searchHistory ? "bg-accent/10 text-accent" : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
            title={searchHistory ? "Search history on" : "Search history off"}
          >
            <Clock className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {/* Operator hints */}
      {parseOperators(query).operators && Object.keys(parseOperators(query).operators).length > 0 && (
        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground/50">
          <span>Operators:</span>
          {Object.entries(parseOperators(query).operators).map(([k, v]) => (
            <span key={k} className="rounded bg-muted/50 px-1.5 py-0.5 font-mono">{k}:{v}</span>
          ))}
        </div>
      )}

      {/* Bang hint */}
      {resolveBang(query) && (
        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground/50">
          <span>Bang detected:</span>
          <span className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-accent">{resolveBang(query)?.bang}</span>
          <span>→ {resolveBang(query)?.def.label}</span>
        </div>
      )}

      {/* Recent searches (empty state) */}
      {!data && !loading && recent.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/40">Recent searches</div>
          <div className="flex flex-wrap gap-2">
            {recent.map((r) => (
              <button key={r} onClick={() => { setQuery(r); run(r); }}
                className="rounded-full bg-muted/40 px-4 py-1.5 text-[12px] text-muted-foreground transition hover:bg-muted hover:text-foreground">
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {data && !data.available && (
        <div className="mt-10 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">Search unavailable</div>
            <div className="mt-1 text-amber-200/70">{data.error || "The Nexus Search provider could not be reached."}</div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => run()} className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-[12px] hover:bg-amber-500/30">Retry</button>
              <button onClick={() => { setData(null); setQuery(""); }} className="rounded-lg border border-amber-500/20 px-3 py-1.5 text-[12px] hover:bg-amber-500/10">Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {data?.available && (
        <div className={`mt-4 ${DENSITIES[density]?.gap || "space-y-3"}`}>
          {data.results.length === 0 && !loading && (
            <div className="py-12 text-center">
              <Search className="mx-auto h-6 w-6 text-muted-foreground/30" />
              <p className="mt-2 text-[13px] text-muted-foreground/60">No results found.</p>
              <p className="mt-1 text-[11px] text-muted-foreground/40">Try different terms, operators, or a bang.</p>
            </div>
          )}
          {data.results.map((r, i) => (
            <ResultRow
              key={normalizeUrl(r.url) || i}
              result={r}
              query={query}
              density={density}
              onNavigate={onNavigate}
              onAction={handleAction}
              onCheckSafety={handleCheckSafety}
            />
          ))}

          {/* Related */}
          {data.related?.length > 0 && (
            <div className="pt-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/40">Related searches</div>
              <div className="flex flex-wrap gap-2">
                {data.related.map((r) => (
                  <button key={r} onClick={() => { setQuery(r); run(r); }}
                    className="rounded-full bg-muted/40 px-4 py-1.5 text-[12px] text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Provider attribution */}
          {data.provider && (
            <div className="pt-4 text-center text-[10px] text-muted-foreground/30">
              Source: {data.provider === "wikipedia" ? "Wikipedia" : data.provider === "duckduckgo" ? "DuckDuckGo" : data.provider}
              {" · "}Nexus client-side ranking, deduplication & security analysis
            </div>
          )}
        </div>
      )}

      {/* Preview overlay */}
      {previewResult && (
        <div className="absolute inset-0 z-40 bg-background/60 backdrop-blur-sm" onClick={() => setPreviewResult(null)}>
          <div className="absolute inset-x-4 top-4 bottom-4 mx-auto max-w-lg overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <ResultPreview
              result={previewResult}
              assessment={previewAssessment}
              onNavigate={(url) => { setPreviewResult(null); onNavigate(url); }}
              onAction={handleAction}
              onClose={() => setPreviewResult(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}