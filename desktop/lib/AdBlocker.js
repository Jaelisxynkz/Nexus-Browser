/**
 * AdBlocker — Electron integration for the ad-block matching engine.
 *
 * Wraps AdBlockEngine and attaches it to Electron sessions using
 * `session.webRequest.onBeforeRequest`. When the engine says a request
 * should be blocked, we return `{ cancel: true }` so Chromium aborts the
 * request at the network level — it never loads, not even hidden.
 *
 * The blocker is per-session: normal and incognito sessions each get their
 * own listener, but they share the same engine (rules + enabled state) so
 * the user's toggle applies everywhere immediately.
 */

'use strict';

const { AdBlockEngine } = require('./adblock-engine');

class AdBlocker {
  constructor(settingsStore) {
    this._engine = new AdBlockEngine();
    this._settings = settingsStore;
    this._attachedSessions = new WeakSet();

    // Apply the persisted enabled state.
    const enabled = this._settings ? this._settings.get('adBlockerEnabled') : true;
    this._engine.setEnabled(enabled !== false);

    // Listen for setting changes so the toggle applies live.
    if (this._settings) {
      this._settings.onChange(({ key, value }) => {
        if (key === 'adBlockerEnabled') this._engine.setEnabled(!!value);
      });
    }
  }

  /**
   * Attach the blocker to an Electron session. Idempotent — a session is
   * only wired once. The listener reads the live engine state on every
   * request, so toggling enabled/disabled takes effect immediately.
   */
  attachToSession(ses) {
    if (this._attachedSessions.has(ses)) return;
    this._attachedSessions.add(ses);

    ses.webRequest.onBeforeRequest((details, callback) => {
      // Only block subresource requests on web pages. Top-level navigation
      // is never blocked (we don't want to prevent the user from visiting
      // a page whose domain happens to be on the blocklist).
      if (details.resourceType === 'mainFrame') {
        callback({});
        return;
      }

      const pageUrl = details.initiator || details.referrer || '';
      const decision = this._engine.shouldBlock(details.url, pageUrl);
      if (decision.block) {
        callback({ cancel: true });
      } else {
        callback({});
      }
    });
  }

  /** Enable or disable the blocker (persists via settings). */
  setEnabled(on) {
    this._engine.setEnabled(!!on);
    if (this._settings) this._settings.set('adBlockerEnabled', !!on);
  }

  isEnabled() { return this._engine.isEnabled(); }

  /** Add a per-site exception (allowlist a site so its requests aren't blocked). */
  addSiteException(host) {
    this._engine.addException(host);
    if (this._settings) this._settings.set('adBlockExceptions', this._engine.exportRules().exceptions);
  }
  removeSiteException(host) { this._engine.removeException(host); }
  hasException(host) { return this._engine.hasException(host); }

  /** Get blocked/allowed counts. */
  getStats() { return this._engine.getStats(); }
  resetStats() { this._engine.resetStats(); }

  /** Export/import full rule set (for persistence). */
  exportRules() { return this._engine.exportRules(); }
  importRules(data) { this._engine.importRules(data); }
}

module.exports = { AdBlocker };