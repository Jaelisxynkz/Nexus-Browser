/**
 * url-utils — robust URL vs. search-query detection.
 *
 * Shared by the main process (address-bar IPC) and the automated tests.
 * The rules are deliberately conservative: a string is only treated as a URL
 * when it genuinely looks like one, so real search queries never accidentally
 * navigate to a domain.
 */

'use strict';

/**
 * Returns true when the input should be treated as a navigable URL rather
 * than a search query.
 *
 * Accepted as URLs:
 *   - explicit protocols: http://, https://, file://, about:, nexus://
 *   - localhost / 127.0.0.1 with optional port and path
 *   - bare IP addresses with optional port
 *   - domain.tld patterns (at least one dot, no spaces) with optional path/query
 *
 * Rejected (treated as search):
 *   - anything containing spaces
 *   - single words with no dots
 *   - empty / whitespace-only strings
 */
function isUrl(input) {
  const v = (input || '').trim();
  if (!v) return false;

  // Explicit protocol — always a URL.
  if (/^(https?|file|ftp|about|nexus):\/\//i.test(v)) return true;
  if (/^about:/i.test(v)) return true;

  // Spaces mean it's a search query, not a URL.
  if (/\s/.test(v)) return false;

  // localhost[:port][/path]
  if (/^localhost(:\d{1,5})?(\/.*)?$/i.test(v)) return true;

  // Bare IPv4[:port][/path]
  if (/^(\d{1,3}\.){3}\d{1,3}(:\d{1,5})?(\/.*)?$/.test(v)) return true;

  // [IPv6][:port][/path] — simplified
  if (/^\[[0-9a-fA-F:]+\](:\d{1,5})?(\/.*)?$/.test(v)) return true;

  // domain.tld pattern: label.label... with optional /path ?query #hash
  // Each label: alphanumeric/hyphen, doesn't start or end with hyphen.
  // TLD must be at least 2 chars (rejects "foo.1" or "foo.x").
  if (/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+([/?#].*)?$/i.test(v)) {
    // Ensure the last label (TLD) is alphabetic and >= 2 chars, or a known
    // special-case like "co.uk" handled implicitly by the dot requirement.
    const host = v.split(/[/?#]/)[0];
    const labels = host.split('.');
    const tld = labels[labels.length - 1];
    if (tld.length >= 2 && /^[a-z][a-z0-9]*$/i.test(tld)) return true;
  }

  return false;
}

/**
 * Normalize a raw address-bar input into a URL ready for navigation.
 *
 *   "https://example.com"      → "https://example.com"
 *   "example.com"              → "https://example.com"
 *   "www.example.com/foo"      → "https://www.example.com/foo"
 *   "localhost:3000"          → "http://localhost:3000"
 *   "hello world"              → null (caller routes to search engine)
 *   "nexus://settings"         → "nexus://settings"
 *   ""                         → null
 */
function normalizeUrl(input) {
  const v = (input || '').trim();
  if (!v) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) return v; // has protocol
  if (/^about:/i.test(v)) return v;
  if (isUrl(v)) {
    if (/^localhost(:\d)/i.test(v) || /^(\d{1,3}\.){3}\d{1,3}/.test(v)) return 'http://' + v;
    return 'https://' + v;
  }
  return null;
}

/**
 * Extract the hostname from a URL string, or '' if invalid.
 */
function hostnameOf(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

/**
 * Normalize a hostname by stripping leading "www.".
 */
function normalizeHost(host) {
  return (host || '').replace(/^www\./i, '').toLowerCase();
}

module.exports = { isUrl, normalizeUrl, hostnameOf, normalizeHost };