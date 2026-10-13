import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Nexus Search — real web search using free public APIs (zero integration credits).
// Strategy (broad web coverage first, factual supplement after):
//   1. DuckDuckGo Lite HTML — broadest free web coverage (real search engine).
//   2. DuckDuckGo Instant Answer API — structured answer for entity queries.
//   3. Wikipedia generator=search — encyclopedic supplement, merged in.
// Results from all successful providers are MERGED and de-duplicated by URL,
// so a query gets real web results first, then a Wikipedia entry if relevant.
// Never fabricates results; if all providers fail, surfaces the error state.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function safeDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function decodeHtmlEntities(s) {
  if (!s) return s;
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/* ---------- Bing HTML (primary, broad web coverage, keyless) ---------- */
// Bing wraps result URLs in a redirect. The real URL is in the `u` query param,
// base64url-encoded (with trailing padding stripped). We decode it back.
function decodeBingRedirect(href) {
  try {
    const u = new URL(href);
    const param = u.searchParams.get('u');
    if (!param) return href;
    // Bing base64url: replace -_ with +/ and pad.
    let b = param.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    const decoded = atob(b);
    return decoded.startsWith('http') ? decoded : href;
  } catch { return href; }
}

async function bingSearch(query) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en&cc=US&count=20`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const html = await res.text();

  // Bing organic results live in <ol id="b_results"><li class="b_algo">...</li>...
  // The <li> blocks don't nest cleanly, so split on each <li ... class="b_algo" boundary.
  const results = [];
  const startIdx = html.indexOf('id="b_results"');
  if (startIdx === -1) return null;
  const section = html.slice(startIdx);
  const blocks = section.split(/<li[^>]*class="b_algo"/i).slice(1);
  for (const rawBlock of blocks) {
    if (results.length >= 12) break;
    let block = '<li class="b_algo"' + rawBlock;
    const endOl = block.indexOf('</ol>');
    if (endOl > -1) block = block.slice(0, endOl);

    // Title link: prefer <h2><a>, else first <a href="http..."> that is NOT the favicon (tilk) link.
    const h2Match = block.match(/<h2[^>]*>[\s\S]*?<a[^>]+href="(https?:[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    let hrefMatch = h2Match;
    if (!hrefMatch) {
      const allLinks = [...block.matchAll(/<a[^>]+href="(https?:[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
      for (const lm of allLinks) {
        if (/class="tilk"/i.test(lm[0])) continue;
        hrefMatch = lm;
        break;
      }
    }
    if (!hrefMatch) continue;
    const rawHref = decodeHtmlEntities(hrefMatch[1]);
    const realUrl = decodeBingRedirect(rawHref);
    const title = decodeHtmlEntities(hrefMatch[2].replace(/<[^>]+>/g, '').trim());
    if (!title || !realUrl.startsWith('http')) continue;
    const dom = safeDomain(realUrl);
    if (dom === 'bing.com' || dom === 'go.microsoft.com') continue;
    const snippetMatch = block.match(/<p[^>]*class="b_lineclamp[0-9]*"[^>]*>([\s\S]*?)<\/p>/i)
      || block.match(/<div[^>]*class="b_caption"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
    const snippet = snippetMatch ? decodeHtmlEntities(snippetMatch[1].replace(/<[^>]+>/g, '').trim()) : '';
    results.push({ title, url: realUrl, description: snippet, domain: dom });
  }
  return results.length > 0 ? results : null;
}

/* ---------- DuckDuckGo Instant Answer (structured entity answers) ---------- */
async function duckDuckGoInstantAnswer(query) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&no_redirect=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const results = [];

  if (data.Abstract && data.AbstractURL) {
    results.push({
      title: data.Heading || data.AbstractText?.slice(0, 80) || query,
      url: data.AbstractURL,
      description: data.AbstractText || data.Abstract || '',
      domain: safeDomain(data.AbstractURL),
    });
  }
  for (const topic of (data.RelatedTopics || [])) {
    if (results.length >= 8) break;
    if (topic.Text && topic.FirstURL) {
      results.push({
        title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 80),
        url: topic.FirstURL,
        description: topic.Text,
        domain: safeDomain(topic.FirstURL),
      });
    }
    if (topic.Topics && Array.isArray(topic.Topics)) {
      for (const sub of topic.Topics) {
        if (results.length >= 8) break;
        if (sub.Text && sub.FirstURL) {
          results.push({
            title: sub.Text.split(' - ')[0] || sub.Text.slice(0, 80),
            url: sub.FirstURL,
            description: sub.Text,
            domain: safeDomain(sub.FirstURL),
          });
        }
      }
    }
  }
  return results.length > 0 ? results : null;
}

/* ---------- Wikipedia (encyclopedic supplement) ---------- */
async function wikipediaSearch(query) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=4&prop=info|extracts&inprop=url&exintro=1&explaintext=1&exsentences=2`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;
  const arr = Object.values(pages).sort((a, b) => (a.index || 0) - (b.index || 0));
  return arr.map((p) => ({
    title: p.title,
    url: p.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
    description: p.extract || `Wikipedia article: ${p.title}.`,
    domain: 'en.wikipedia.org',
  }));
}

/* ---------- Merge + de-duplicate ---------- */
function dedupeByDomain(results) {
  // Keep first occurrence per domain to avoid 10 Wikipedia rows,
  // while preserving the provider order (DDG web results first).
  const seen = new Set();
  return results.filter((r) => {
    const key = (r.domain || safeDomain(r.url) || r.url).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildRelated(query) {
  const q = query.toLowerCase();
  const suffixes = ['tutorial', 'guide', 'examples', 'documentation', 'best practices', 'vs'];
  return suffixes.map((s) => `${q} ${s}`);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    const category = typeof body.category === 'string' ? body.category : 'web';
    if (!query) return Response.json({ error: 'query required' }, { status: 400 });

    // Run all providers in parallel; each is independent.
    const [bing, ddg, wiki] = await Promise.allSettled([
      bingSearch(query),
      duckDuckGoInstantAnswer(query),
      wikipediaSearch(query),
    ]);

    let merged = [];
    const providers = [];

    // 1. Bing — broad web results go FIRST (real search engine).
    if (bing.status === 'fulfilled' && bing.value && bing.value.length > 0) {
      merged = merged.concat(bing.value);
      providers.push('bing');
    }

    // 2. DuckDuckGo Instant Answer — structured answer next.
    if (ddg.status === 'fulfilled' && ddg.value && ddg.value.length > 0) {
      merged = merged.concat(ddg.value);
      providers.push('duckduckgo');
    }

    // 3. Wikipedia — encyclopedic supplement, appended after web results.
    if (wiki.status === 'fulfilled' && wiki.value && wiki.value.length > 0) {
      merged = merged.concat(wiki.value);
      providers.push('wikipedia');
    }

    // De-duplicate by domain, cap at 12 results.
    merged = dedupeByDomain(merged).slice(0, 12);

    const provider = providers.length > 0 ? providers.join('+') : 'none';
    const related = buildRelated(query);

    // Record search history
    await base44.asServiceRole.entities.HistoryEntry.create({
      url: 'nexus://search?q=' + encodeURIComponent(query),
      title: 'Search: ' + query,
      visited_at: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({
      provider,
      available: merged.length > 0,
      results: merged,
      related,
    });
  } catch (error) {
    return Response.json({ provider: 'nexus-web', available: false, error: error.message, results: [] }, { status: 200 });
  }
}