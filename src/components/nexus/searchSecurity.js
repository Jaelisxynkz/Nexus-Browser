/**
 * Nexus Site Security Engine — client-side URL risk analysis.
 *
 * Zero Base44 integration credits. Zero external calls. Pure local heuristics.
 *
 * Pipeline:
 *   URL Parser → Feature Extraction → Heuristic Rules → Risk Aggregator
 *   → Confidence Scoring → Human Explanation
 *
 * Honest by design:
 *   - Never claims "100% safe" or "malware detected" without evidence.
 *   - Returns "UNKNOWN" when evidence is insufficient.
 *   - Every signal is real and explainable.
 *   - Risk score is a browser-side assessment, NOT a guarantee.
 */

/* ------------------------------------------------------------------ */
/* URL Parsing & Normalization                                         */
/* ------------------------------------------------------------------ */

const SUSPICIOUS_TLDS = new Set([
  "zip", "mov", "xyz", "top", "click", "link", "work", "gq", "tk", "ml",
  "cf", "ga", "country", "kim", "science", "review", "racing", "download",
  "stream", "online", "site", "live", "rest", "uno", "cn", "ru",
]);

const SHORTENER_DOMAINS = new Set([
  "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "is.gd", "buff.ly",
  "rebrand.ly", "cutt.ly", "shorturl.at", "t.ly", "rb.gy", "shorte.st",
  "adf.ly", "bc.vc", "soo.gd", "s2r.co", "v.gd", "qr.ae", "x.co",
  "tiny.cc", "snip.ly", "yourls.org", "po.st", "s.id", "lnkd.in",
]);

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "fbclid", "gclid", "dclid", "msclkid", "yclid", "mc_eid", "mc_cid",
  "_hsenc", "_hsmi", "icid", "vero_id", "wickedid", "ref", "ref_src",
]);

const KNOWN_OFFICIAL_DOMAINS = {
  "github.com": "GitHub",
  "gitlab.com": "GitLab",
  "stackoverflow.com": "Stack Overflow",
  "developer.mozilla.org": "MDN Web Docs",
  "wikipedia.org": "Wikipedia",
  "python.org": "Python",
  "nodejs.org": "Node.js",
  "react.dev": "React",
  "apple.com": "Apple",
  "microsoft.com": "Microsoft",
  "google.com": "Google",
  "amazon.com": "Amazon",
  "mozilla.org": "Mozilla",
  "w3.org": "W3C",
  "ietf.org": "IETF",
  "nist.gov": "NIST",
  "ieee.org": "IEEE",
  "linux.org": "Linux",
  "kernel.org": "Linux Kernel",
};

const LOGIN_KEYWORDS = ["login", "signin", "sign-in", "auth", "account", "password", "credential", "verify", "wallet", "seed", "phrase"];

const DOWNLOAD_EXTENSIONS = [".exe", ".scr", ".bat", ".cmd", ".com", ".pif", ".vbs", ".js", ".jar", ".msi", ".dll", ".ps1", ".apk", ".deb", ".rpm", ".dmg", ".pkg", ".sh"];

/**
 * Parse a URL safely, returning null if it can't be parsed or uses a
 * dangerous/unexpected scheme.
 */
export function parseUrl(input) {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Reject dangerous schemes outright.
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("file:")) {
    return { url: trimmed, dangerousScheme: true, scheme: lower.split(":")[0] };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { url: trimmed, unparseable: true };
  }
  return {
    url: trimmed,
    href: parsed.href,
    protocol: parsed.protocol,
    scheme: parsed.protocol.replace(":", ""),
    hostname: parsed.hostname,
    port: parsed.port,
    pathname: parsed.pathname,
    search: parsed.search,
    hash: parsed.hash,
    origin: parsed.origin,
  };
}

/**
 * Normalize a URL for duplicate detection: strip tracking params, normalize
 * trailing slash, lowercase host, drop fragment.
 */
export function normalizeUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    // Strip tracking params
    TRACKING_PARAMS.forEach((p) => u.searchParams.delete(p));
    // Normalize www prefix
    u.hostname = u.hostname.replace(/^www\./, "");
    // Drop default ports
    if ((u.protocol === "http:" && u.port === "80") || (u.protocol === "https:" && u.port === "443")) {
      u.port = "";
    }
    // Normalize trailing slash on root
    if (u.pathname === "/") u.pathname = "";
    return u.origin + u.pathname + (u.search || "") + (u.hash || "");
  } catch {
    return url;
  }
}

/* ------------------------------------------------------------------ */
/* Feature Extraction                                                  */
/* ------------------------------------------------------------------ */

function isIp(host) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || /^[a-f0-9:]+$/i.test(host) && host.includes(":");
}

function hasPunycode(host) {
  return /xn--/i.test(host);
}

function hasIdnHomograph(host) {
  // Mixed-script detection: latin + cyrillic/greek in same label
  const labels = host.split(".");
  for (const label of labels) {
    const hasLatin = /[a-z]/i.test(label);
    const hasCyrillic = /[\u0400-\u04ff]/i.test(label);
    const hasGreek = /[\u0370-\u03ff]/i.test(label);
    if ((hasLatin && hasCyrillic) || (hasLatin && hasGreek)) return true;
  }
  return false;
}

function countSubdomains(host) {
  const parts = host.split(".");
  // e.g. a.b.c.com = 4 parts, 2 subdomains beyond the TLD+1
  return Math.max(0, parts.length - 2);
}

function hasAtSign(rawUrl) {
  // The @ trick: http://evil.com@legit.com makes the browser go to legit.com
  // but displays "evil.com" as the user-facing part. When the URL parser sees
  // a username, the authority contains an @ before the host — that's the
  // credential/redirect trick worth flagging.
  try {
    const u = new URL(rawUrl);
    // A real userinfo (username[:password]@host) means @ is present in authority.
    if (u.username || u.password) return true;
    return false;
  } catch {
    // Fallback: check for @ before the first / after the scheme
    const m = rawUrl.match(/^https?:\/\/[^/]*@/i);
    return !!m;
  }
}

function isUrlShortener(host) {
  return SHORTENER_DOMAINS.has(host.replace(/^www\./, ""));
}

function urlLength(rawUrl) {
  return rawUrl.length;
}

function encodedRatio(rawUrl) {
  const pct = (rawUrl.match(/%[0-9a-f]{2}/gi) || []).length;
  return rawUrl.length > 0 ? pct * 3 / rawUrl.length : 0;
}

function tldOf(host) {
  const parts = host.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function hasLoginKeyword(pathname) {
  const p = pathname.toLowerCase();
  return LOGIN_KEYWORDS.some((k) => p.includes(k));
}

function hasDownloadExtension(pathname) {
  const p = pathname.toLowerCase();
  return DOWNLOAD_EXTENSIONS.some((ext) => p.endsWith(ext));
}

function isLocalhost(host) {
  return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1" || /^192\.168\./.test(host) || /^10\./.test(host);
}

function portIsNonStandard(scheme, port) {
  if (!port) return false;
  if (scheme === "https" && port !== "443") return true;
  if (scheme === "http" && port !== "80") return true;
  return false;
}

function depthOf(pathname) {
  return pathname.split("/").filter(Boolean).length;
}

function hasRedirectParam(search) {
  try {
    const u = new URL("https://x.com" + search);
    for (const [k, v] of u.searchParams) {
      const lk = k.toLowerCase();
      if (["url", "redirect", "next", "to", "dest", "destination", "return", "goto", "redir"].includes(lk)) {
        if (/^https?:\/\//i.test(v)) return true;
      }
    }
  } catch {}
  return false;
}

function looksLikeLookalike(host, query) {
  // Heuristic: brand name in query but host doesn't contain it
  if (!query) return false;
  const brands = ["google", "apple", "microsoft", "amazon", "paypal", "facebook", "instagram", "github", "netflix", "bank", "chase", "wellsfargo", "coinbase"];
  const brand = brands.find((b) => query.toLowerCase().includes(b));
  if (brand && !host.includes(brand)) return true;
  return false;
}

/* ------------------------------------------------------------------ */
/* Heuristic Rules → Signals                                          */
/* ------------------------------------------------------------------ */

/**
 * Each signal: { id, severity, label, detail, ok }
 *   severity: 0 = neutral, 1 = minor, 2 = moderate, 3 = serious, 4 = critical
 *   ok: true = a positive/protective signal
 */
function analyzeFeatures(parsed, query) {
  const signals = [];
  if (!parsed) return signals;

  // Dangerous scheme — immediate critical
  if (parsed.dangerousScheme) {
    signals.push({ id: "dangerous-scheme", severity: 4, label: "Dangerous URL scheme", detail: `The "${parsed.scheme}:" scheme can execute code or embed content maliciously. Nexus will not navigate to it.` });
    return signals;
  }
  if (parsed.unparseable) {
    signals.push({ id: "unparseable", severity: 3, label: "Malformed URL", detail: "Nexus could not parse this as a valid URL." });
    return signals;
  }

  const host = parsed.hostname || "";
  const scheme = parsed.scheme;
  const path = parsed.pathname || "";
  const raw = parsed.url;

  // Protocol
  if (scheme === "https") signals.push({ id: "https", severity: 0, label: "HTTPS connection", detail: "The connection is encrypted with HTTPS.", ok: true });
  else if (scheme === "http") signals.push({ id: "http", severity: 2, label: "Insecure HTTP", detail: "This site uses unencrypted HTTP. Traffic can be observed or modified on the network." });
  else if (scheme === "nexus") signals.push({ id: "nexus-internal", severity: 0, label: "Internal Nexus route", detail: "This is a Nexus internal page, not a web destination.", ok: true });
  else {
    // Unknown/unhandled scheme — treat as internal/neutral to avoid false risk
    signals.push({ id: "non-web-scheme", severity: 0, label: "Non-web URL scheme", detail: `This URL uses the "${scheme}" scheme.`, ok: true });
  }

  // IP host
  if (isIp(host)) signals.push({ id: "raw-ip", severity: 3, label: "Raw IP address", detail: "The destination is a raw IP address rather than a domain name. Legitimate sites almost always use domains." });

  // Localhost (developer workflow — not a risk)
  if (isLocalhost(host)) {
    signals.push({ id: "localhost", severity: 0, label: "Local address", detail: "This is a local/development address. It stays on your machine.", ok: true });
  }

  // Punycode / IDN
  if (hasPunycode(host)) signals.push({ id: "punycode", severity: 3, label: "Punycode (internationalized) domain", detail: "The domain uses encoded international characters. Verify the address bar shows what you expect." });

  // Homograph
  if (hasIdnHomograph(host)) signals.push({ id: "homograph", severity: 4, label: "Possible homograph attack", detail: "The domain mixes character sets (e.g. Latin + Cyrillic) that look identical. This is a common phishing technique." });

  // Excessive subdomains
  const subs = countSubdomains(host);
  if (subs >= 4) signals.push({ id: "deep-subdomain", severity: 2, label: "Excessive subdomains", detail: `The host has ${subs} subdomain levels, which is unusual and can be used to mimic legitimate domains.` });

  // @ sign trick
  if (hasAtSign(raw)) signals.push({ id: "at-trick", severity: 4, label: "Credential/redirect trick", detail: "The URL contains an '@' symbol that can redirect to a different host than the one displayed." });

  // URL shortener
  if (isUrlShortener(host)) signals.push({ id: "shortener", severity: 2, label: "URL shortener", detail: "This is a shortened URL. The final destination is hidden until you follow it." });

  // Length
  if (urlLength(raw) > 200) signals.push({ id: "long-url", severity: 1, label: "Very long URL", detail: `This URL is ${raw.length} characters long, which can hide the real destination.` });

  // Excessive encoding
  if (encodedRatio(raw) > 0.15) signals.push({ id: "heavy-encoding", severity: 2, label: "Heavily encoded URL", detail: "A large portion of this URL is percent-encoded, which can obscure the destination." });

  // Suspicious TLD
  const tld = tldOf(host);
  if (SUSPICIOUS_TLDS.has(tld)) signals.push({ id: "tld", severity: 1, label: `.${tld} TLD`, detail: `The .${tld} top-level domain is frequently abused, though it is not inherently malicious.` });

  // Non-standard port (skip for localhost — developer ports are normal)
  if (portIsNonStandard(scheme, parsed.port) && !isLocalhost(host)) signals.push({ id: "port", severity: 2, label: `Non-standard port :${parsed.port}`, detail: `This site uses port ${parsed.port}, which is unusual for ${scheme.toUpperCase()}.` });

  // Login keywords + non-https = phishing risk
  if (hasLoginKeyword(path) && scheme !== "https") {
    signals.push({ id: "login-http", severity: 4, label: "Login form on insecure page", detail: "The URL path suggests authentication but the page is not HTTPS. Credentials would be sent in cleartext." });
  } else if (hasLoginKeyword(path)) {
    signals.push({ id: "login-page", severity: 1, label: "Authentication page", detail: "This page appears to request credentials. Verify the domain carefully." });
  }

  // Download extension
  if (hasDownloadExtension(path)) {
    signals.push({ id: "download", severity: 3, label: "Direct executable download", detail: "This URL points directly to an executable or script file. Only open it if you trust the source." });
  }

  // Redirect param
  if (hasRedirectParam(parsed.search)) signals.push({ id: "redirect-param", severity: 2, label: "Open redirect parameter", detail: "The URL contains a parameter that redirects to another site, which can be abused." });

  // Lookalike vs query
  if (looksLikeLookalike(host, query)) signals.push({ id: "lookalike", severity: 3, label: "Possible lookalike domain", detail: `You searched for a known brand but this domain doesn't match it. Verify the address.` });

  // Deep path
  if (depthOf(path) > 6) signals.push({ id: "deep-path", severity: 1, label: "Deep URL path", detail: "The URL has an unusually deep path, which can hide the real content." });

  // Known official — positive signal
  const bareHost = host.replace(/^www\./, "");
  for (const [domain, name] of Object.entries(KNOWN_OFFICIAL_DOMAINS)) {
    if (bareHost === domain || bareHost.endsWith("." + domain)) {
      signals.push({ id: "known-official", severity: 0, label: `Recognized official domain`, detail: `${name} operates this domain.`, ok: true });
      break;
    }
  }

  return signals;
}

/* ------------------------------------------------------------------ */
/* Risk Aggregation                                                    */
/* ------------------------------------------------------------------ */

function aggregate(signals) {
  let risk = 0;
  let maxSeverity = 0;
  let hasOk = false;
  let hasWarning = false;
  let hasCritical = false;

  for (const s of signals) {
    if (s.ok) { hasOk = true; continue; }
    // Weight by severity
    const weight = { 1: 8, 2: 18, 3: 32, 4: 55 }[s.severity] || 0;
    risk += weight;
    maxSeverity = Math.max(maxSeverity, s.severity);
    if (s.severity >= 4) hasCritical = true;
    else if (s.severity >= 2) hasWarning = true;
  }

  // Slight credit for HTTPS/known-official (they reduce risk)
  if (hasOk) risk = Math.max(0, risk - 5);

  risk = Math.min(100, Math.max(0, Math.round(risk)));

  // Determine level
  let level;
  if (risk <= 20) level = "low";
  else if (risk <= 40) level = "guarded";
  else if (risk <= 60) level = "suspicious";
  else if (risk <= 80) level = "high";
  else level = "critical";

  // Confidence: based on how many signals fired and their severity.
  // More signals = higher confidence in the assessment (we have more evidence).
  // If only positive signals and no warnings, confidence is medium (absence of evidence).
  const warningCount = signals.filter((s) => !s.ok && s.severity > 0).length;
  const okCount = signals.filter((s) => s.ok).length;
  let confidence;
  if (hasCritical) confidence = "high";
  else if (warningCount >= 2) confidence = "high";
  else if (warningCount === 1) confidence = "medium";
  else if (okCount >= 2) confidence = "medium";
  else confidence = "low";

  return { risk, level, confidence, hasOk, hasWarning, hasCritical, warningCount };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

const LEVELS = {
  low: { label: "LOW RISK", color: "emerald", description: "No major warning signals detected." },
  guarded: { label: "GUARDED", color: "sky", description: "Minor signals noted. Use normal caution." },
  suspicious: { label: "SUSPICIOUS", color: "amber", description: "Multiple risk indicators present." },
  high: { label: "HIGH RISK", color: "orange", description: "Strong risk indicators. Review before proceeding." },
  critical: { label: "CRITICAL RISK", color: "rose", description: "Severe risk indicators detected. Do not proceed unless certain." },
  unknown: { label: "UNKNOWN", color: "slate", description: "Nexus does not have enough reliable evidence to assess this URL." },
};

export function levelInfo(level) {
  return LEVELS[level] || LEVELS.unknown;
}

/**
 * Analyze a URL for risk. Returns a full assessment.
 * @param {string} url
 * @param {string} [query] — the search query (for lookalike detection)
 * @returns {Assessment}
 */
export function analyzeUrl(url, query) {
  const parsed = parseUrl(url);
  const signals = analyzeFeatures(parsed, query);
  const agg = aggregate(signals);

  // If we have essentially no signals (e.g. internal route), mark unknown.
  if (signals.length === 0) {
    return {
      url,
      risk: 0,
      level: "unknown",
      confidence: "low",
      signals: [],
      summary: "Nexus does not have enough reliable evidence to make a stronger determination.",
      recommendation: "No information available.",
      scannedAt: Date.now(),
    };
  }

  // Build recommendation
  let recommendation;
  if (agg.level === "low") recommendation = "No major warning signals detected. You can proceed normally.";
  else if (agg.level === "guarded") recommendation = "Minor signals noted. Verify the domain and proceed if it matches your expectation.";
  else if (agg.level === "suspicious") recommendation = "Review the signals below. Proceed only if you recognize and trust the destination.";
  else if (agg.level === "high") recommendation = "Strong risk indicators. Do not enter credentials or personal information. Consider going back.";
  else recommendation = "Severe risk indicators. Nexus recommends not proceeding. If you must, open in a private window and enter no sensitive information.";

  const summary = LEVELS[agg.level].description;

  return {
    url,
    risk: agg.risk,
    level: agg.level,
    confidence: agg.confidence,
    signals,
    summary,
    recommendation,
    scannedAt: Date.now(),
  };
}

/* ------------------------------------------------------------------ */
/* Result Classification (intelligence labels)                          */
/* ------------------------------------------------------------------ */

export function classifyResult(result) {
  if (!result || !result.url) return null;
  const host = (() => { try { return new URL(result.url).hostname.replace(/^www\./, ""); } catch { return ""; } })();
  const path = (() => { try { return new URL(result.url).pathname.toLowerCase(); } catch { return ""; } })();
  const title = (result.title || "").toLowerCase();

  const labels = [];

  if (host.endsWith("wikipedia.org")) labels.push({ kind: "reference", label: "Reference" });
  if (host.endsWith("github.com")) labels.push({ kind: "repo", label: "Repository" });
  if (host.endsWith("stackoverflow.com")) labels.push({ kind: "forum", label: "Forum" });
  if (host.endsWith("reddit.com")) labels.push({ kind: "social", label: "Social" });
  if (host.endsWith("youtube.com") || host.endsWith("vimeo.com")) labels.push({ kind: "video", label: "Video" });
  if (host.endsWith("arxiv.org") || host.endsWith("doi.org") || host.endsWith("scholar.google.com")) labels.push({ kind: "academic", label: "Academic" });
  if (host.endsWith("npmjs.com") || host.endsWith("pypi.org") || host.endsWith("registry.terraform.io")) labels.push({ kind: "package", label: "Package" });
  if (path.match(/\.(pdf|docx?|pptx?|xlsx?)$/)) labels.push({ kind: "document", label: "Document" });
  if (title.includes("documentation") || title.includes("docs") || host.includes("docs.")) labels.push({ kind: "docs", label: "Docs" });
  if (host.endsWith("medium.com") || host.endsWith("dev.to") || host.endsWith("hashnode.dev")) labels.push({ kind: "article", label: "Article" });

  // Official detection
  for (const [domain, name] of Object.entries(KNOWN_OFFICIAL_DOMAINS)) {
    if (host === domain || host.endsWith("." + domain)) {
      labels.unshift({ kind: "official", label: `Official — ${name}` });
      break;
    }
  }

  return labels.length > 0 ? labels : null;
}

/* ------------------------------------------------------------------ */
/* Search Operator Parser                                              */
/* ------------------------------------------------------------------ */

export function parseOperators(query) {
  const result = { query: query, operators: {}, clean: query };
  if (!query) return result;

  let q = query;

  // site:domain
  const siteMatch = q.match(/\bsite:([^\s]+)/i);
  if (siteMatch) { result.operators.site = siteMatch[1]; q = q.replace(siteMatch[0], "").trim(); }

  // filetype:ext
  const ftMatch = q.match(/\bfiletype:([^\s]+)/i);
  if (ftMatch) { result.operators.filetype = ftMatch[1]; q = q.replace(ftMatch[0], "").trim(); }

  // intitle:term
  const itMatch = q.match(/\bintitle:([^\s]+)/i);
  if (itMatch) { result.operators.intitle = itMatch[1]; q = q.replace(itMatch[0], "").trim(); }

  // before:YYYY
  const beforeMatch = q.match(/\bbefore:(\d{4})/i);
  if (beforeMatch) { result.operators.before = beforeMatch[1]; q = q.replace(beforeMatch[0], "").trim(); }

  // after:YYYY
  const afterMatch = q.match(/\bafter:(\d{4})/i);
  if (afterMatch) { result.operators.after = afterMatch[1]; q = q.replace(afterMatch[0], "").trim(); }

  result.clean = q.trim();
  return result;
}

/* ------------------------------------------------------------------ */
/* Search Bangs                                                        */
/* ------------------------------------------------------------------ */

export const SEARCH_BANGS = {
  "!g": { label: "Google", url: (q) => "https://www.google.com/search?q=" + encodeURIComponent(q) },
  "!ddg": { label: "DuckDuckGo", url: (q) => "https://duckduckgo.com/?q=" + encodeURIComponent(q) },
  "!yt": { label: "YouTube", url: (q) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q) },
  "!gh": { label: "GitHub", url: (q) => "https://github.com/search?q=" + encodeURIComponent(q) },
  "!wiki": { label: "Wikipedia", url: (q) => "https://en.wikipedia.org/w/index.php?search=" + encodeURIComponent(q) },
  "!reddit": { label: "Reddit", url: (q) => "https://www.reddit.com/search?q=" + encodeURIComponent(q) },
  "!npm": { label: "npm", url: (q) => "https://www.npmjs.com/search?q=" + encodeURIComponent(q) },
  "!mdn": { label: "MDN", url: (q) => "https://developer.mozilla.org/search?q=" + encodeURIComponent(q) },
  "!so": { label: "Stack Overflow", url: (q) => "https://stackoverflow.com/search?q=" + encodeURIComponent(q) },
  "!maps": { label: "Maps", url: (q) => "https://www.google.com/maps/search/" + encodeURIComponent(q) },
  "!images": { label: "Images", url: (q) => "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(q) },
  "!news": { label: "News", url: (q) => "https://news.google.com/search?q=" + encodeURIComponent(q) },
};

export const SEARCH_DOMAIN_BANGS = {
  "@yt": { label: "YouTube", url: (q) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q) },
  "@gh": { label: "GitHub", url: (q) => "https://github.com/search?q=" + encodeURIComponent(q) },
  "@wiki": { label: "Wikipedia", url: (q) => "https://en.wikipedia.org/w/index.php?search=" + encodeURIComponent(q) },
  "@reddit": { label: "Reddit", url: (q) => "https://www.reddit.com/search?q=" + encodeURIComponent(q) },
  "@npm": { label: "npm", url: (q) => "https://www.npmjs.com/search?q=" + encodeURIComponent(q) },
  "@mdn": { label: "MDN", url: (q) => "https://developer.mozilla.org/search?q=" + encodeURIComponent(q) },
  "@so": { label: "Stack Overflow", url: (q) => "https://stackoverflow.com/search?q=" + encodeURIComponent(q) },
};

/**
 * Detect a bang prefix and return the redirect URL, or null.
 */
export function resolveBang(input) {
  const v = (input || "").trim();
  if (!v) return null;
  // !bang query
  for (const [bang, def] of Object.entries(SEARCH_BANGS)) {
    if (v.toLowerCase().startsWith(bang + " ")) {
      return { bang, def, query: v.slice(bang.length + 1), url: def.url(v.slice(bang.length + 1)) };
    }
  }
  // @domain bang
  for (const [bang, def] of Object.entries(SEARCH_DOMAIN_BANGS)) {
    if (v.toLowerCase().startsWith(bang + " ")) {
      return { bang, def, query: v.slice(bang.length + 1), url: def.url(v.slice(bang.length + 1)) };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Duplicate Suppression                                               */
/* ------------------------------------------------------------------ */

export function deduplicateResults(results) {
  const seen = new Map();
  const out = [];
  for (const r of results) {
    const key = normalizeUrl(r.url);
    if (seen.has(key)) continue;
    seen.set(key, true);
    out.push(r);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Result Ranking                                                      */
/* ------------------------------------------------------------------ */

export function rankResults(results, query) {
  if (!query) return results;
  const q = query.toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);

  return results
    .map((r) => {
      const title = (r.title || "").toLowerCase();
      const url = (r.url || "").toLowerCase();
      const domain = (r.domain || "").toLowerCase();
      const desc = (r.description || "").toLowerCase();

      let score = 0;
      // Exact title match
      if (title === q) score += 50;
      // Title contains all terms
      if (terms.every((t) => title.includes(t))) score += 25;
      // Title contains query as substring
      if (title.includes(q)) score += 15;
      // Title starts with query
      if (title.startsWith(q)) score += 10;
      // Domain contains query
      if (domain.includes(q)) score += 12;
      // Domain exact match
      if (domain === q) score += 20;
      // Per-term in description
      terms.forEach((t) => { if (desc.includes(t)) score += 2; });
      // URL contains query
      if (url.includes(q)) score += 5;
      // Known official domain bonus
      const bareDomain = domain.replace(/^www\./, "");
      for (const d of Object.keys(KNOWN_OFFICIAL_DOMAINS)) {
        if (bareDomain === d || bareDomain.endsWith("." + d)) { score += 15; break; }
      }
      // HTTPS preference
      if (url.startsWith("https://")) score += 3;

      return { ...r, _score: score };
    })
    .sort((a, b) => b._score - a._score);
}

/* ------------------------------------------------------------------ */
/* Why-this-result explanation                                         */
/* ------------------------------------------------------------------ */

export function whyThisResult(result, query) {
  const reasons = [];
  if (!result || !query) return reasons;
  const q = query.toLowerCase();
  const title = (result.title || "").toLowerCase();
  const domain = (result.domain || "").toLowerCase();

  if (title === q) reasons.push("Exact title match");
  else if (title.includes(q)) reasons.push("Title contains your query");
  else if (q.split(/\s+/).every((t) => title.includes(t))) reasons.push("Title contains all search terms");

  if (domain.includes(q)) reasons.push("Domain matches your query");
  if (result.url?.startsWith("https://")) reasons.push("Secure HTTPS connection");

  const bareDomain = domain.replace(/^www\./, "");
  for (const d of Object.keys(KNOWN_OFFICIAL_DOMAINS)) {
    if (bareDomain === d || bareDomain.endsWith("." + d)) { reasons.push("Recognized official domain"); break; }
  }

  if (reasons.length === 0) reasons.push("Matched by the search provider");
  return reasons;
}

/* ------------------------------------------------------------------ */
/* Security Scan Cache (local, time-limited)                           */
/* ------------------------------------------------------------------ */

const SCAN_CACHE = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export function getCachedScan(url) {
  const entry = SCAN_CACHE.get(url);
  if (!entry) return null;
  if (Date.now() - entry.scannedAt > CACHE_TTL) {
    SCAN_CACHE.delete(url);
    return null;
  }
  return entry;
}

export function cacheScan(url, assessment) {
  SCAN_CACHE.set(url, assessment);
}

export function clearScanCache() {
  SCAN_CACHE.clear();
}

/**
 * Analyze with cache. Always returns fresh if force=true.
 */
export function analyzeUrlCached(url, query, force = false) {
  if (!force) {
    const cached = getCachedScan(url);
    if (cached) return { ...cached, fromCache: true };
  }
  const assessment = analyzeUrl(url, query);
  cacheScan(url, assessment);
  return { ...assessment, fromCache: false };
}