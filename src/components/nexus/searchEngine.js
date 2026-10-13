import NexusServices from "./services";

/**
 * Search engine provider system.
 *
 * Nexus Search is the default engine. External engines (Google, Bing, etc.) are
 * built as search URLs — choosing one redirects queries to that provider's
 * results page. Nero Search always routes through the Nexus backend function.
 */

export const SEARCH_ENGINES = {
  nexus: {
    id: "nexus",
    label: "Nexus Search",
    builtin: true,
    // searchUrl used only for the results page title/domain
  },
  google: {
    id: "google",
    label: "Google",
    builtin: false,
    url: (q) => "https://www.google.com/search?igu=1&q=" + encodeURIComponent(q),
  },
  bing: {
    id: "bing",
    label: "Bing",
    builtin: false,
    url: (q) => "https://www.bing.com/search?q=" + encodeURIComponent(q),
  },
  duckduckgo: {
    id: "duckduckgo",
    label: "DuckDuckGo",
    builtin: false,
    url: (q) => "https://duckduckgo.com/?q=" + encodeURIComponent(q),
  },
  brave: {
    id: "brave",
    label: "Brave Search",
    builtin: false,
    url: (q) => "https://search.brave.com/search?q=" + encodeURIComponent(q),
  },
  custom: {
    id: "custom",
    label: "Custom Search Engine",
    builtin: false,
    url: null, // built from settings.customSearchUrl at runtime
  },
};

export function engineUrlFor(id, query, customSearchUrl) {
  if (!query) return null;
  const engine = SEARCH_ENGINES[id];
  if (!engine) return "nexus://search?q=" + encodeURIComponent(query);
  if (id === "nexus") return "nexus://search?q=" + encodeURIComponent(query);
  if (id === "custom") {
    if (!customSearchUrl) return "nexus://search?q=" + encodeURIComponent(query);
    return customSearchUrl.replace(/\{searchTerms\}|\{query\}|%s/g, encodeURIComponent(query));
  }
  return engine.url(query);
}

/**
 * Resolve a raw address-bar / search input into a navigate target.
 * - Valid URL  -> navigate to the URL (never converted to a search)
 * - nexus://   -> internal route
 * - otherwise  -> search using the active engine
 */
export function resolveInput(input, { engine, customSearchUrl }) {
  const v = (input || "").trim();
  if (!v) return null;
  if (v.startsWith("nexus://")) return v;

  const isUrl = /^https?:\/\//i.test(v);
  const looksDomain = /^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(v) && !v.includes(" ");
  if (isUrl) return v;
  if (looksDomain) return "https://" + v;

  return engineUrlFor(engine, v, customSearchUrl);
}

// For the StartPage / address bar: determine whether a query should route to Nexus results.
export function shouldUseNexus(engine) {
  return engine === "nexus";
}

/**
 * Load search suggestions for a query prefix.
 * - For Nexus search: local history-based suggestions + an AI hint.
 * - For external engines: empty (we don't proxy them) unless we keep local history.
 * Returns an array of { label, url }.
 */
export async function getSuggestions(query, { engine, customSearchUrl, history }) {
  const q = (query || "").trim();
  if (!q) return [];
  const historySuggestions = (history || [])
    .filter((h) => h.title && h.title.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 4)
    .map((h) => ({ label: h.title, url: h.url }));
  // For non-Nexus engines, add a "search in engine" suggestion
  const explicit = engineUrlFor(engine, q, customSearchUrl);
  const engineSuggestion = { label: `Search for “${q}”`, url: explicit };
  return [engineSuggestion, ...historySuggestions].filter(Boolean);
}

// Convenience: actually run Nexus search (returns {available, results, related}).
export async function runNexusSearch(query, category = "web") {
  const res = await NexusServices.search({ query, category });
  return res;
}