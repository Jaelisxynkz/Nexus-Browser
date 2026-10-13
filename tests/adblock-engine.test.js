/**
 * Tests for the ad-block matching engine.
 */
import { AdBlockEngine, matchesRule } from '../desktop/lib/adblock-engine.js';

describe('matchesRule', () => {
  it('matches exact domain', () => {
    expect(matchesRule('doubleclick.net', 'doubleclick.net')).toBe(true);
  });

  it('matches subdomains of a blocked domain', () => {
    expect(matchesRule('ads.doubleclick.net', 'doubleclick.net')).toBe(true);
    expect(matchesRule('a.b.doubleclick.net', 'doubleclick.net')).toBe(true);
  });

  it('does not match unrelated domains that share a suffix', () => {
    expect(matchesRule('notdoubleclick.net', 'doubleclick.net')).toBe(false);
  });

  it('handles wildcard rules', () => {
    expect(matchesRule('ads.example.com', '*.example.com')).toBe(true);
    expect(matchesRule('a.b.example.com', '*.example.com')).toBe(true);
    expect(matchesRule('example.com', '*.example.com')).toBe(false);
  });
});

describe('AdBlockEngine', () => {
  it('blocks requests to blocklisted domains', () => {
    const engine = new AdBlockEngine();
    const result = engine.shouldBlock('https://doubleclick.net/ad.js', 'https://example.com');
    expect(result.block).toBe(true);
    expect(result.reason).toBe('blocklist');
  });

  it('does not block normal sites', () => {
    const engine = new AdBlockEngine();
    const result = engine.shouldBlock('https://example.com/page', 'https://example.com');
    expect(result.block).toBe(false);
  });

  it('allowlist overrides blocklist', () => {
    const engine = new AdBlockEngine({
      blocklist: ['example.com'],
      allowlist: ['example.com'],
    });
    const result = engine.shouldBlock('https://example.com/ad.js', 'https://other.com');
    expect(result.block).toBe(false);
    expect(result.reason).toBe('allowlist');
  });

  it('per-site exceptions disable blocking for that site', () => {
    const engine = new AdBlockEngine();
    engine.addException('example.com');
    const result = engine.shouldBlock('https://doubleclick.net/ad.js', 'https://example.com');
    expect(result.block).toBe(false);
    expect(result.reason).toBe('site-exception');
  });

  it('disabled engine never blocks', () => {
    const engine = new AdBlockEngine();
    engine.setEnabled(false);
    const result = engine.shouldBlock('https://doubleclick.net/ad.js', 'https://example.com');
    expect(result.block).toBe(false);
  });

  it('tracks blocked/allowed statistics', () => {
    const engine = new AdBlockEngine();
    engine.shouldBlock('https://doubleclick.net/ad.js', 'https://example.com');
    engine.shouldBlock('https://example.com/page', 'https://example.com');
    const stats = engine.getStats();
    expect(stats.blocked).toBe(1);
    expect(stats.allowed).toBe(1);
    expect(stats.total).toBe(2);
  });

  it('supports runtime rule additions', () => {
    const engine = new AdBlockEngine();
    expect(engine.shouldBlock('https://evil-ads.com/ad.js', 'https://example.com').block).toBe(false);
    engine.addToBlocklist('evil-ads.com');
    expect(engine.shouldBlock('https://evil-ads.com/ad.js', 'https://example.com').block).toBe(true);
  });

  it('export/import preserves rules', () => {
    const engine = new AdBlockEngine();
    engine.addException('test.com');
    engine.addToBlocklist('custom-ads.com');
    const exported = engine.exportRules();

    const engine2 = new AdBlockEngine();
    engine2.importRules(exported);
    expect(engine2.hasException('test.com')).toBe(true);
    expect(engine2.shouldBlock('https://custom-ads.com/ad.js', 'https://example.com').block).toBe(true);
  });
});