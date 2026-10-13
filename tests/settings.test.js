/**
 * Tests for SettingsStore — main-process settings persistence.
 * Uses a temp directory so no real user data is touched.
 */
import { SettingsStore, DEFAULT_SETTINGS } from '../desktop/lib/SettingsStore.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-test-'));
}

describe('SettingsStore', () => {
  let dir, store;

  beforeEach(() => {
    dir = tempDir();
    store = new SettingsStore(dir);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('loads defaults on first run', () => {
    expect(store.get('adBlockerEnabled')).toBe(true);
    expect(store.get('searchEngine')).toBe('nexus');
    expect(store.get('theme')).toBe('midnight');
  });

  it('persists a setting to disk', () => {
    store.set('adBlockerEnabled', false);
    expect(store.get('adBlockerEnabled')).toBe(false);

    const store2 = new SettingsStore(dir);
    expect(store2.get('adBlockerEnabled')).toBe(false);
  });

  it('persists multiple settings at once', () => {
    store.setMany({ searchEngine: 'google', theme: 'ocean' });
    expect(store.get('searchEngine')).toBe('google');
    expect(store.get('theme')).toBe('ocean');

    const store2 = new SettingsStore(dir);
    expect(store2.get('searchEngine')).toBe('google');
    expect(store2.get('theme')).toBe('ocean');
  });

  it('notifies listeners on change', () => {
    let received = null;
    const unsub = store.onChange((evt) => { received = evt; });
    store.set('theme', 'neon');
    expect(received.key).toBe('theme');
    expect(received.value).toBe('neon');
    unsub();
  });

  it('resets to defaults', () => {
    store.set('theme', 'ocean');
    store.set('searchEngine', 'bing');
    store.reset();
    expect(store.get('theme')).toBe('midnight');
    expect(store.get('searchEngine')).toBe('nexus');
  });

  it('survives corrupted settings file', () => {
    store.set('theme', 'ocean');
    fs.writeFileSync(path.join(dir, 'settings.json'), '{ not valid json');
    const store2 = new SettingsStore(dir);
    expect(store2.get('theme')).toBe('midnight');
  });

  it('DEFAULT_SETTINGS has all expected keys', () => {
    expect(DEFAULT_SETTINGS).toHaveProperty('adBlockerEnabled');
    expect(DEFAULT_SETTINGS).toHaveProperty('searchEngine');
    expect(DEFAULT_SETTINGS).toHaveProperty('firstRunComplete');
    expect(DEFAULT_SETTINGS).toHaveProperty('downloadsDir');
  });
});