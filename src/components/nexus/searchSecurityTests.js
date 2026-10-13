/**
 * Nexus Security Engine — test suite.
 *
 * Deterministic tests for URL parsing, feature extraction, risk scoring,
 * punycode, homograph, IP detection, redirect tricks, shorteners, operators,
 * deduplication, and false-positive/negative behavior.
 *
 * Run with: import { runSecurityTests } from "./searchSecurityTests";
 *           const results = runSecurityTests();
 */
import {
  parseUrl, normalizeUrl, analyzeUrl, parseOperators, deduplicateResults,
  resolveBang, rankResults, whyThisResult,
} from "./searchSecurity";

function assert(label, actual, expected, op = "===") {
  let pass;
  if (op === "===") pass = actual === expected;
  else if (op === ">") pass = actual > expected;
  else if (op === ">=") pass = actual >= expected;
  else if (op === "<") pass = actual < expected;
  else if (op === "<=") pass = actual <= expected;
  else if (op === "includes") pass = typeof actual === "string" && actual.includes(expected);
  else if (op === "!includes") pass = typeof actual === "string" && !actual.includes(expected);
  else if (op === "truthy") pass = !!actual;
  else if (op === "falsy") pass = !actual;
  else if (op === "length") pass = Array.isArray(actual) && actual.length === expected;
  return { label, pass, actual, expected };
}

export function runSecurityTests() {
  const tests = [];
  const section = (name) => tests.push({ section: name, results: [] });

  /* ---- URL Parsing ---- */
  section("URL Parsing");
  tests[tests.length - 1].results.push(
    assert("parses https URL", parseUrl("https://example.com").scheme, "https"),
    assert("parses http URL", parseUrl("http://example.com").scheme, "http"),
    assert("parses nexus internal", parseUrl("nexus://search").scheme, "nexus"),
    assert("rejects javascript scheme", parseUrl("javascript:alert(1)").dangerousScheme, true),
    assert("rejects data scheme", parseUrl("data:text/html,hi").dangerousScheme, true),
    assert("rejects file scheme", parseUrl("file:///etc/passwd").dangerousScheme, true),
    assert("marks unparseable", parseUrl("not a url at all").unparseable, true),
    assert("extracts hostname", parseUrl("https://www.example.com/path").hostname, "www.example.com"),
    assert("extracts port", parseUrl("https://example.com:8443").port, "8443"),
  );

  /* ---- IP Detection ---- */
  section("IP Address Detection");
  tests[tests.length - 1].results.push(
    assert("flags IPv4", analyzeUrl("http://192.168.1.1/login").signals.some((s) => s.id === "raw-ip"), true),
    assert("flags raw IP in https", analyzeUrl("https://203.0.113.5/").signals.some((s) => s.id === "raw-ip"), true),
    assert("does not flag normal domain", analyzeUrl("https://example.com/").signals.some((s) => s.id === "raw-ip"), false),
  );

  /* ---- Homograph / Punycode ---- */
  section("Homograph & Punycode");
  tests[tests.length - 1].results.push(
    assert("flags punycode", analyzeUrl("https://xn--80ak6aa92e.com/").signals.some((s) => s.id === "punycode"), true),
    assert("punycode is at least guarded", ["guarded","suspicious","high","critical"].includes(analyzeUrl("https://xn--80ak6aa92e.com/").level), true),
    assert("flags homograph (cyrillic)", analyzeUrl("https://аpple.com/").signals.some((s) => s.id === "homograph" || s.id === "punycode"), true),
    assert("does not flag normal domain", analyzeUrl("https://apple.com/").signals.some((s) => s.id === "homograph"), false),
  );

  /* ---- @ Redirect Trick ---- */
  section("@ Redirect Trick");
  tests[tests.length - 1].results.push(
    assert("flags @ trick (userinfo in authority)", analyzeUrl("https://evil.com@legit.com/").signals.some((s) => s.id === "at-trick"), true),
    assert("does not flag normal URL with no @", analyzeUrl("https://example.com/path").signals.some((s) => s.id === "at-trick"), false),
  );

  /* ---- URL Shorteners ---- */
  section("URL Shorteners");
  tests[tests.length - 1].results.push(
    assert("flags bit.ly", analyzeUrl("https://bit.ly/abc123").signals.some((s) => s.id === "shortener"), true),
    assert("flags tinyurl", analyzeUrl("https://tinyurl.com/xyz").signals.some((s) => s.id === "shortener"), true),
    assert("does not flag normal domain", analyzeUrl("https://github.com/repo").signals.some((s) => s.id === "shortener"), false),
  );

  /* ---- HTTP vs HTTPS ---- */
  section("Protocol Security");
  tests[tests.length - 1].results.push(
    assert("flags insecure HTTP", analyzeUrl("http://example.com/login").signals.some((s) => s.id === "http"), true),
    assert("credits HTTPS", analyzeUrl("https://example.com/").signals.some((s) => s.id === "https" && s.ok), true),
    assert("flags login over HTTP as critical", analyzeUrl("http://fakebank.com/login").signals.some((s) => s.id === "login-http"), true),
    assert("https login is just info", analyzeUrl("https://github.com/login").signals.some((s) => s.id === "login-http"), false),
  );

  /* ---- Download Detection ---- */
  section("Download Detection");
  tests[tests.length - 1].results.push(
    assert("flags .exe", analyzeUrl("https://example.com/file.exe").signals.some((s) => s.id === "download"), true),
    assert("flags .apk", analyzeUrl("https://example.com/app.apk").signals.some((s) => s.id === "download"), true),
    assert("does not flag .html", analyzeUrl("https://example.com/page.html").signals.some((s) => s.id === "download"), false),
  );

  /* ---- Risk Scoring Levels ---- */
  section("Risk Scoring");
  tests[tests.length - 1].results.push(
    assert("github.com is low risk", analyzeUrl("https://github.com/").level, "low"),
    assert("wikipedia.org is low risk", analyzeUrl("https://en.wikipedia.org/wiki/Test").level, "low"),
    assert("raw IP is high+", analyzeUrl("http://203.0.113.5/login").level, "high", ">="),
    assert("homograph + http login is critical", analyzeUrl("http://xn--80ak6aa92e.com/login").level, "critical"),
    assert("https example is low", analyzeUrl("https://example.com/").level, "low"),
    assert("localhost is low", analyzeUrl("http://localhost:3000/").level, "low"),
  );

  /* ---- No False Positives ---- */
  section("False Positive Resistance");
  tests[tests.length - 1].results.push(
    assert("developer site not flagged critical", analyzeUrl("https://developer.mozilla.org/docs").level, "low"),
    assert("stackoverflow not flagged", analyzeUrl("https://stackoverflow.com/questions/123").level, "low"),
    assert("banking site not over-flagged", analyzeUrl("https://www.chase.com/").level, "low"),
    assert("youtube not flagged", analyzeUrl("https://www.youtube.com/watch?v=abc").level, "low"),
    assert("long docs URL not over-flagged", analyzeUrl("https://docs.python.org/3/library/asyncio-task.html").level, "low", "<="),
  );

  /* ---- Deduplication ---- */
  section("Deduplication");
  tests[tests.length - 1].results.push(
    assert("dedupes tracking params", deduplicateResults([
      { url: "https://example.com/page?utm_source=x" },
      { url: "https://example.com/page" },
    ]).length, 1),
    assert("dedupes trailing slash", deduplicateResults([
      { url: "https://example.com" },
      { url: "https://example.com/" },
    ]).length, 1),
    assert("dedupes www prefix", deduplicateResults([
      { url: "https://www.example.com" },
      { url: "https://example.com" },
    ]).length, 1),
    assert("preserves distinct pages", deduplicateResults([
      { url: "https://example.com/page1" },
      { url: "https://example.com/page2" },
    ]).length, 2),
  );

  /* ---- Operators ---- */
  section("Search Operators");
  tests[tests.length - 1].results.push(
    assert("parses site:", parseOperators("site:github.com nexus").operators.site, "github.com"),
    assert("parses filetype:", parseOperators("filetype:pdf browser").operators.filetype, "pdf"),
    assert("parses intitle:", parseOperators("intitle:security browser").operators.intitle, "security"),
    assert("parses before:", parseOperators("browser before:2026").operators.before, "2026"),
    assert("parses after:", parseOperators("browser after:2025").operators.after, "2025"),
    assert("clean query removes operator", parseOperators("site:github.com nexus browser").clean, "nexus browser"),
  );

  /* ---- Bangs ---- */
  section("Search Bangs");
  tests[tests.length - 1].results.push(
    assert("!g resolves to google", resolveBang("!g nexus browser")?.def.label, "Google"),
    assert("!yt resolves to youtube", resolveBang("!yt music")?.def.label, "YouTube"),
    assert("@gh resolves to github", resolveBang("@gh nexus")?.def.label, "GitHub"),
    assert("no bang returns null", resolveBang("just a search"), null),
    assert("!bang has query", resolveBang("!w quantum")?.query, "quantum"),
  );

  /* ---- Ranking ---- */
  section("Ranking");
  tests[tests.length - 1].results.push(
    assert("exact title match ranks higher", (() => {
      const ranked = rankResults([
        { title: "something else", url: "https://other.com", domain: "other.com" },
        { title: "nexus browser", url: "https://nexus.com", domain: "nexus.com" },
      ], "nexus browser");
      return ranked[0].title === "nexus browser";
    })(), true),
    assert("official domain gets bonus", (() => {
      const ranked = rankResults([
        { title: "nexus", url: "https://random.com/nexus", domain: "random.com" },
        { title: "nexus", url: "https://github.com/nexus", domain: "github.com" },
      ], "nexus");
      return ranked[0].domain === "github.com";
    })(), true),
  );

  /* ---- Why This Result ---- */
  section("Why This Result");
  tests[tests.length - 1].results.push(
    assert("returns reasons for match", whyThisResult({ title: "nexus browser", url: "https://github.com/nexus", domain: "github.com" }, "nexus browser").length, 0, ">"),
    assert("returns reasons for official", whyThisResult({ title: "React", url: "https://react.dev", domain: "react.dev" }, "react").some((r) => r.includes("official")), true),
  );

  /* ---- Unknown State ---- */
  section("Unknown State");
  tests[tests.length - 1].results.push(
    assert("internal nexus route is low/unknown (non-web)", ["low","unknown"].includes(analyzeUrl("nexus://settings").level), true),
  );

  // Summary
  const all = tests.flatMap((t) => t.results);
  const passed = all.filter((r) => r.pass).length;
  const failed = all.length - passed;
  return { sections: tests, passed, failed, total: all.length };
}