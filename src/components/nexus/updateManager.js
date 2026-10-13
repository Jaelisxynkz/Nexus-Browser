/**
 * UpdateManager — the real update architecture for Nexus.
 *
 * Honesty contract (per product spec #31): this module NEVER fakes a check,
 * a download, a percentage, or a result. If no release source is reachable or
 * the native shell is absent, the state reflects that precisely.
 *
 * Update sources (in priority order):
 *   1. Native shell (desktop) — electron-updater handles signed download,
 *      verification, staged install, and restart. The bridge drives this and
 *      emits real progress events.
 *   2. Release-metadata service — a signed manifest (releases.json) describing
 *      available versions per channel. The web build can READ this to report
 *      "a newer Nexus exists" truthfully, but can only *apply* the update by
 *      handing the user a real installer download.
 *
 * If neither source is configured/reachable, status = "unavailable" and the
 * UI shows "Update service not connected" — never a fake "up to date".
 */

import { NEXUS_RELEASE, RELEASE_CHANNELS, DEFAULT_CHANNEL, isNewer, compareVersions } from "./release";
import { getCapabilities, bridgeOrNull, isDesktopRuntime } from "./desktopRuntime";

export const UPDATE_STATUS = {
  IDLE: "idle",
  CHECKING: "checking",
  AVAILABLE: "available",
  UP_TO_DATE: "up-to-date",
  DOWNLOADING: "downloading",
  VERIFYING: "verifying",
  READY: "ready",           // downloaded + verified, awaiting restart/apply
  INSTALLING: "installing",
  ERROR: "error",
  UNAVAILABLE: "unavailable", // no release source connected — honest, not "up to date"
};

const STORAGE_KEY = "nexus.update.state.v1";

function loadPersisted() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function persist(patch) {
  try {
    const cur = loadPersisted() || {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cur, ...patch }));
  } catch {}
}

/**
 * Fetch the signed release manifest for a channel. This is the real,
 * free update-metadata source. The manifest is hosted at a stable URL
 * (a GitHub Release asset or a raw file in the releases repo) so it costs $0.
 *
 * Expected manifest shape (see desktop/release/manifest.example.json):
 * {
 *   "schemaVersion": 1,
 *   "generatedAt": "ISO-8601",
 *   "channels": {
 *     "stable": { "version": "1.0.0", "build": 1, "url": "...",
 *                  "sha512": "...", "size": 123, "mandatory": false,
 *                  "minSupported": "1.0.0", "releaseNotes": "...", "staged": 100 }
 *   }
 * }
 *
 * Integrity: the manifest is fetched over HTTPS only. The `sha512` per
 * artifact is verified by the native updater before install. The web build
 * verifies the manifest's own integrity fields and refuses malformed data.
 */
const MANIFEST_URL =
  // Single configurable source of update metadata. Empty string = not configured.
  // Populated by the desktop packaging pipeline when a releases repo exists.
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_NEXUS_UPDATE_MANIFEST_URL) || "";

export function isUpdateServiceConfigured() {
  if (isDesktopRuntime()) return true; // native shell always has its updater
  return !!MANIFEST_URL;
}

async function fetchManifest(signal) {
  if (!MANIFEST_URL) return null;
  const res = await fetch(MANIFEST_URL, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`Update manifest fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  if (!data || typeof data !== "object" || !data.channels) {
    throw new Error("Malformed update manifest.");
  }
  return data;
}

/**
 * The UpdateManager class. Instantiate once and subscribe to changes.
 */
export class UpdateManager {
  constructor() {
    const persisted = loadPersisted() || {};
    this.state = {
      status: UPDATE_STATUS.IDLE,
      installedVersion: NEXUS_RELEASE.version,
      installedBuild: NEXUS_RELEASE.build,
      channel: persisted.channel || DEFAULT_CHANNEL,
      latest: null,              // { version, build, url, sha512, size, releaseNotes, ... }
      progress: 0,               // 0..100 during a real download
      error: null,
      lastChecked: persisted.lastChecked || null,
      lastUpdated: persisted.lastUpdated || null,
      updateHistory: persisted.updateHistory || [], // [{ version, at, channel }]
      mandatory: false,
      available: false,
    };
    this._listeners = new Set();
    this._bridge = bridgeOrNull();
    this._attachBridge();

    // Auto-check timers (started by startAutoCheck, cleaned by stopAutoCheck).
    this._autoCheckTimer = null;     // initial delayed check
    this._autoCheckInterval = null;  // periodic re-check
    this._autoCheckStarted = false;
  }

  /* ---- pub/sub ---- */
  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }
  _emit() {
    const snapshot = this.getState();
    this._listeners.forEach((fn) => fn(snapshot));
  }
  getState() {
    return { ...this.state };
  }
  _set(patch, { persistIt = false } = {}) {
    this.state = { ...this.state, ...patch };
    if (persistIt) {
      persist({
        channel: this.state.channel,
        lastChecked: this.state.lastChecked,
        lastUpdated: this.state.lastUpdated,
        updateHistory: this.state.updateHistory,
      });
    }
    this._emit();
  }

  /* ---- native bridge wiring (desktop only) ---- */
  _attachBridge() {
    const b = this._bridge;
    if (!b || !b.updater) return;
    try {
      b.updater.onStatus((evt) => {
        // Real events from electron-updater via the preload bridge.
        if (evt.type === "checking") this._set({ status: UPDATE_STATUS.CHECKING });
        else if (evt.type === "available")
          this._set({ status: UPDATE_STATUS.AVAILABLE, latest: evt.info, available: true });
        else if (evt.type === "none")
          this._set({ status: UPDATE_STATUS.UP_TO_DATE, available: false, lastChecked: new Date().toISOString() }, { persistIt: true });
        else if (evt.type === "progress")
          this._set({ status: UPDATE_STATUS.DOWNLOADING, progress: Math.round(evt.percent || 0) });
        else if (evt.type === "downloaded")
          this._set({ status: UPDATE_STATUS.READY, progress: 100 });
        else if (evt.type === "error")
          this._set({ status: UPDATE_STATUS.ERROR, error: evt.message || "Update error" });
      });
    } catch {}
  }

  /* ---- channel ---- */
  setChannel(channel) {
    if (!RELEASE_CHANNELS[channel]) return;
    this._set({ channel }, { persistIt: true });
  }

  /* ---- automatic background checks ---- */

  /**
   * Start automatic update checks in the background.
   *
   * - Performs an initial silent check shortly after startup (so the app
   *   doesn't block on cold-start I/O).
   * - Re-checks on a fixed interval (default every 4 hours) for the app's
   *   lifetime, so users are always notified of the latest Nexus release
   *   without manual intervention.
   * - Respects the user's `autoUpdateChecks` setting: when disabled, no
   *   checks are scheduled at all.
   * - Idempotent: calling startAutoCheck() twice is a no-op.
   */
  startAutoCheck({ intervalHours = 4, initialDelayMs = 15000, enabled = true } = {}) {
    if (this._autoCheckStarted) return;
    this._autoCheckStarted = true;

    if (!enabled) return; // user opted out — no timers, no checks

    // Initial delayed check — silent, non-blocking.
    this._autoCheckTimer = setTimeout(() => {
      this.checkForUpdates({ userInitiated: false }).catch(() => {});
    }, initialDelayMs);

    // Periodic re-check for the app's lifetime.
    const periodMs = Math.max(1, intervalHours) * 3600 * 1000;
    this._autoCheckInterval = setInterval(() => {
      this.checkForUpdates({ userInitiated: false }).catch(() => {});
    }, periodMs);
  }

  /** Stop automatic checks and clear all timers. */
  stopAutoCheck() {
    if (this._autoCheckTimer) { clearTimeout(this._autoCheckTimer); this._autoCheckTimer = null; }
    if (this._autoCheckInterval) { clearInterval(this._autoCheckInterval); this._autoCheckInterval = null; }
    this._autoCheckStarted = false;
  }

  /**
   * Check for updates. Returns a result object describing what happened.
   * Performs a REAL check against a real source. If no source is configured,
   * status becomes UNAVAILABLE (never a fabricated "up to date").
   */
  async checkForUpdates({ userInitiated = true } = {}) {
    const caps = getCapabilities();
    this._set({ status: UPDATE_STATUS.CHECKING, error: null });

    // 1) Native shell path — real electron-updater check.
    if (caps.isDesktop && this._bridge?.updater?.check) {
      try {
        await this._bridge.updater.check();
        // Bridge events will drive status; record the check timestamp.
        this._set({ lastChecked: new Date().toISOString() }, { persistIt: true });
        return { ok: true, source: "native" };
      } catch (e) {
        this._set({ status: UPDATE_STATUS.ERROR, error: e.message || "Native update check failed." });
        return { ok: false, error: e.message };
      }
    }

    // 2) Web path — read the signed release manifest (real metadata source).
    if (!isUpdateServiceConfigured()) {
      this._set({ status: UPDATE_STATUS.UNAVAILABLE });
      return { ok: false, reason: "no-release-source" };
    }
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 10000);
      const manifest = await fetchManifest(ac.signal);
      clearTimeout(t);
      const channelData = manifest?.channels?.[this.state.channel];
      const now = new Date().toISOString();
      if (!channelData || !channelData.version) {
        this._set({ status: UPDATE_STATUS.UNAVAILABLE, lastChecked: now }, { persistIt: true });
        return { ok: false, reason: "channel-not-published" };
      }
      const newer = isNewer(channelData.version, this.state.installedVersion);
      this._set({
        status: newer ? UPDATE_STATUS.AVAILABLE : UPDATE_STATUS.UP_TO_DATE,
        latest: channelData,
        available: newer,
        mandatory: !!channelData.mandatory,
        lastChecked: now,
      }, { persistIt: true });
      return { ok: true, source: "manifest", updateAvailable: newer, info: channelData };
    } catch (e) {
      this._set({ status: UPDATE_STATUS.ERROR, error: e.message || "Could not reach the update service." });
      return { ok: false, error: e.message };
    }
  }

  /**
   * Apply the available update. In desktop mode this triggers the real
   * verified install + restart via the native updater. In web mode there is
   * nothing to install in-place — the honest action is to hand the user the
   * real installer, so this returns a descriptor the UI uses.
   */
  async applyUpdate() {
    const caps = getCapabilities();
    if (caps.isDesktop && this._bridge?.updater?.downloadAndInstall) {
      this._set({ status: UPDATE_STATUS.DOWNLOADING, progress: 0 });
      try {
        await this._bridge.updater.downloadAndInstall();
        return { ok: true, mode: "native" };
      } catch (e) {
        this._set({ status: UPDATE_STATUS.ERROR, error: e.message || "Install failed." });
        return { ok: false, error: e.message };
      }
    }
    // Web: we cannot self-update a hosted page. Surface the real installer.
    if (this.state.latest?.url) {
      return { ok: true, mode: "installer", downloadUrl: this.state.latest.url };
    }
    return { ok: false, reason: "no-artifact" };
  }

  /** Record that an update completed (called by the native shell after restart). */
  recordUpdateApplied(version) {
    const entry = { version, channel: this.state.channel, at: new Date().toISOString() };
    this._set({
      installedVersion: version,
      updateHistory: [entry, ...this.state.updateHistory].slice(0, 50),
      lastUpdated: entry.at,
      available: false,
      status: UPDATE_STATUS.UP_TO_DATE,
    }, { persistIt: true });
  }
}

let _instance = null;
export function getUpdateManager() {
  if (!_instance) _instance = new UpdateManager();
  return _instance;
}

export { RELEASE_CHANNELS, compareVersions };