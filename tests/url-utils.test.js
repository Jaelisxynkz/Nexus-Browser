/**
 * Tests for URL vs. search-query detection.
 * These are the exact examples from the spec that must work.
 */
import { isUrl, normalizeUrl, normalizeHost } from '../desktop/lib/url-utils.js';

describe('isUrl', () => {
  it('accepts explicit https/http URLs', () => {
    expect(isUrl('https://example.com')).toBe(true);
    expect(isUrl('http://example.com')).toBe(true);
    expect(isUrl('https://github.com/Jaelisxynkz/Nexus-Browser')).toBe(true);
  });

  it('accepts bare domains', () => {
    expect(isUrl('example.com')).toBe(true);
    expect(isUrl('www.example.com')).toBe(true);
    expect(isUrl('youtube.com')).toBe(true);
    expect(isUrl('youtube.com/watch?v=abc')).toBe(true);
  });

  it('accepts localhost and IPs', () => {
    expect(isUrl('localhost')).toBe(true);
    expect(isUrl('localhost:3000')).toBe(true);
    expect(isUrl('127.0.0.1')).toBe(true);
    expect(isUrl('192.168.1.1:8080')).toBe(true);
  });

  it('rejects search queries', () => {
    expect(isUrl('hello world')).toBe(false);
    expect(isUrl('best gaming laptop')).toBe(false);
    expect(isUrl('')).toBe(false);
    expect(isUrl('   ')).toBe(false);
  });

  it('rejects single words without dots', () => {
    expect(isUrl('hello')).toBe(false);
    expect(isUrl('test123')).toBe(false);
  });

  it('accepts nexus:// internal URLs', () => {
    expect(isUrl('nexus://settings')).toBe(true);
    expect(isUrl('nexus://search?q=test')).toBe(true);
  });
});

describe('normalizeUrl', () => {
  it('adds https:// to bare domains', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
    expect(normalizeUrl('www.example.com/foo')).toBe('https://www.example.com/foo');
  });

  it('uses http:// for localhost and IPs', () => {
    expect(normalizeUrl('localhost:3000')).toBe('http://localhost:3000');
    expect(normalizeUrl('127.0.0.1')).toBe('http://127.0.0.1');
  });

  it('preserves existing protocols', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
    expect(normalizeUrl('nexus://settings')).toBe('nexus://settings');
  });

  it('returns null for search queries', () => {
    expect(normalizeUrl('hello world')).toBe(null);
    expect(normalizeUrl('best gaming laptop')).toBe(null);
    expect(normalizeUrl('')).toBe(null);
  });

  it('handles the spec examples correctly', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    expect(normalizeUrl('www.example.com')).toBe('https://www.example.com');
    expect(normalizeUrl('youtube.com')).toBe('https://youtube.com');
    expect(normalizeUrl('hello world')).toBe(null);
    expect(normalizeUrl('best gaming laptop')).toBe(null);
    expect(normalizeUrl('https://github.com/Jaelisxynkz/Nexus-Browser')).toBe('https://github.com/Jaelisxynkz/Nexus-Browser');
  });
});

describe('normalizeHost', () => {
  it('strips leading www. and lowercases', () => {
    expect(normalizeHost('WWW.Example.com')).toBe('example.com');
    expect(normalizeHost('sub.example.com')).toBe('sub.example.com');
    expect(normalizeHost('')).toBe('');
  });
});