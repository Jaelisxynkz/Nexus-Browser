/**
 * SettingsStore — main-process settings persistence.
 *
 * Settings are stored as a single JSON file in the user-data directory.
 * This is the authoritative store for the native shell: ad-blocker enabled,
 * search engine, startup behavior, download path, etc. The renderer reads
 * and writes these via IPC; the main process applies them to live sessions.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_SETTINGS = {
  // Browser behavior
  adBlockerEnabled: true,
  searchEngine: 'nexus',
  customSearchUrl: '',
  startup: 'newtab',          // newtab | continue | pages
  homepage: 'nexus://start',
  newTabBehavior: 'startpage',

  // Privacy
  trackingProtection: 'standard', // off | standard | strict
  thirdPartyCookies: false,
  clearOnExit: false,
  httpsOnly: 'preferred',    // off | preferred | strict

  // Downloads
  askWhereToSave: false,
  downloadsDir: '',           // empty = OS default

  // Appearance
  theme: 'midnight',
  accent: '#3b82f6',
  density: 'comfortable',

  // Tabs
  tabPosition: 'top',
  tabPreviews: true,
  sleepingTabs: true,

  // Sidebar
  sidebarEnabled: true,
  sidebarPosition: 'left',

  // Audio
  uiSounds: true,
  masterVolume: 70,

  // First-run
  firstRunComplete: false,
};

class SettingsStore {
  constructor(userDataDir) {
    this._filePath = path.join(userDataDir, 'settings.json');
    this._data = { ...DEFAULT_SETTINGS };
    this._listeners = new Set();
    this._load();
  }

  _load() {
    try {
      const raw = fs.readFileSync(this._filePath, 'utf8');
      const parsed = JSON.parse(raw);
      this._data = { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      // First run or corrupted — use defaults. We will persist on first set().
      this._data = { ...DEFAULT_SETTINGS };
    }
  }

  _persist() {
    try {
      fs.writeFileSync(this._filePath, JSON.stringify(this._data, null, 2));
    } catch (e) {
      console.error('[SettingsStore] Failed to persist:', e.message);
    }
  }

  get(key) {
    return this._data[key];
  }

  getAll() {
    return { ...this._data };
  }

  set(key, value) {
    this._data[key] = value;
    this._persist();
    this._listeners.forEach((fn) => fn({ key, value, all: this.getAll() }));
  }

  setMany(patch) {
    Object.assign(this._data, patch);
    this._persist();
    this._listeners.forEach((fn) => fn({ all: this.getAll() }));
  }

  reset() {
    this._data = { ...DEFAULT_SETTINGS };
    this._persist();
    this._listeners.forEach((fn) => fn({ all: this.getAll() }));
  }

  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }
}

module.exports = { SettingsStore, DEFAULT_SETTINGS };