/**
 * adblock-engine — the pure matching engine for the Nexus ad blocker.
 *
 * This module contains NO Electron APIs — it is pure JavaScript, so it can be
 * unit-tested without an Electron runtime. The AdBlocker class in
 * adblock.js wraps this engine and attaches it to Electron sessions.
 *
 * Matching semantics:
 *   - "example.com"        matches example.com and *.example.com
 *   - "*.example.com"      matches *.example.com but NOT example.com itself
 *   - exact host match     always wins over a wildcard
 *   - allowlist entries    override blocklist matches (per-site exceptions)
 */

'use strict';

const { DEFAULT_BLOCKLIST, DEFAULT_ALLOWLIST } = require('./adblock-rules');
const { normalizeHost } = require('./url-utils');

/**
 * Check whether `host` matches a single rule pattern.
 */
function matchesRule(host, rule) {
  host = normalizeHost(host);
  if (!host || !rule) return false;

  // Wildcard: *.example.com — matches subdomains only, NOT the base domain itself.
  if (rule.startsWith('*.')) {
    const base = rule.slice(2);
    return host.endsWith('.' + base);
  }

  // Exact domain or subdomain match: "example.com" matches "example.com"
  // and "sub.example.com" but NOT "notexample.com".
  return host === rule || host.endsWith('.' + rule);
}

/**
 * Check whether `host` matches any rule in the list.
 */
function matchesAny(host, rules) {
  for (const rule of rules) {
    if (matchesRule(host, rule)) return true;
  }
  return false;
}

/**
 * The ad-block matching engine. Stateful: holds the current blocklist,
 * allowlist, and per-site exceptions. All methods are synchronous and pure
 * (no side effects, no I/O).
 */
class AdBlockEngine {
  constructor(opts = {}) {
    this._blocklist = new Set((opts.blocklist || DEFAULT_BLOCKLIST).map((r) => r.toLowerCase()));
    this._allowlist = new Set((opts.allowlist || DEFAULT_ALLOWLIST).map((r) => r.toLowerCase()));
    // Per-site exceptions: when a host is excepted, no blocking applies to it.
    this._exceptions = new Set();
    this._enabled = true;
    this._stats = { blocked: 0, allowed: 0, total: 0 };
  }

  /** Enable or disable the engine. When disabled, shouldBlock always returns false. */
  setEnabled(on) { this._enabled = !!on; }
  isEnabled() { return this._enabled; }

  /** Add a domain to the blocklist (runtime update). */
  addToBlocklist(domain) { this._blocklist.add(domain.toLowerCase()); }
  removeFromBlocklist(domain) { this._blocklist.delete(domain.toLowerCase()); }

  /** Add a domain to the allowlist (runtime update). */
  addToAllowlist(domain) { this._allowlist.add(domain.toLowerCase()); }
  removeFromAllowlist(domain) { this._allowlist.delete(domain.toLowerCase()); }

  /** Except a site — no blocking applies to requests from this site. */
  addException(host) { this._exceptions.add(normalizeHost(host)); }
  removeException(host) { this._exceptions.delete(normalizeHost(host)); }
  hasException(host) { return this._exceptions.has(normalizeHost(host)); }

  /**
   * Decide whether a request to `requestUrl` (originating from a page on
   * `pageUrl`) should be blocked.
   *
   * Returns { block: boolean, reason: string|null }.
   */
  shouldBlock(requestUrl, pageUrl) {
    this._stats.total++;
    if (!this._enabled) {
      this._stats.allowed++;
      return { block: false, reason: null };
    }

    const reqHost = normalizeHost(hostnameOf(requestUrl));
    if (!reqHost) {
      this._stats.allowed++;
      return { block: false, reason: null };
    }

    // Per-site exception: if the PAGE host is excepted, allow everything.
    const pageHost = normalizeHost(hostnameOf(pageUrl || ''));
    if (pageHost && this.hasException(pageHost)) {
      this._stats.allowed++;
      return { block: false, reason: 'site-exception' };
    }

    // Allowlist always wins.
    if (matchesAny(reqHost, [...this._allowlist])) {
      this._stats.allowed++;
      return { block: false, reason: 'allowlist' };
    }

    // Blocklist check.
    if (matchesAny(reqHost, [...this._blocklist])) {
      this._stats.blocked++;
      return { block: true, reason: 'blocklist' };
    }

    this._stats.allowed++;
    return { block: false, reason: null };
  }

  /** Current statistics snapshot. */
  getStats() { return { ...this._stats }; }
  resetStats() { this._stats = { blocked: 0, allowed: 0, total: 0 }; }

  /** Export/import the full rule set (for persistence). */
  exportRules() {
    return {
      blocklist: [...this._blocklist],
      allowlist: [...this._allowlist],
      exceptions: [...this._exceptions],
      enabled: this._enabled,
    };
  }
  importRules(data) {
    if (!data) return;
    if (Array.isArray(data.blocklist)) this._blocklist = new Set(data.blocklist.map((r) => r.toLowerCase()));
    if (Array.isArray(data.allowlist)) this._allowlist = new Set(data.allowlist.map((r) => r.toLowerCase()));
    if (Array.isArray(data.exceptions)) this._exceptions = new Set(data.exceptions.map((r) => normalizeHost(r)));
    if (typeof data.enabled === 'boolean') this._enabled = data.enabled;
  }
}

// Re-exported here so tests can reach them without a second require.
function hostnameOf(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

module.exports = { AdBlockEngine, matchesRule, matchesAny };