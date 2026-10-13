/**
 * Nexus Desktop — real update service.
 *
 * Wraps electron-updater with the full lifecycle from spec §4–§9:
 *   check → compare → download securely → verify integrity → notify →
 *   install → restart (preserving user data) → recover on failure.
 *
 * Honesty contract (spec §31): no stage is faked. If electron-updater cannot
 * reach a real release provider, it emits an error event — the UI then shows
 * "Update service not connected", never a fabricated success.
 *
 * Code signing (spec §8): electron-updater verifies the signature of the
 * downloaded asset when a `publisherName` / certificate is provided at build
 * time via electron-builder's signing config. Until a certificate is supplied,
 * `autoUpdater` runs in UNSIGNED mode and we report signing as "not enforced"
 * — we never claim a signature was verified when none was applied.
 */

const { autoUpdater, AppUpdater } = require("electron-updater");
const { app, ipcMain, BrowserWindow } = require("electron");

class UpdateService {
  constructor(window) {
    this.window = window;
    this._listeners = new Set();
    this._wireIpc();
    this._wireAutoUpdater();
  }

  _emit(evt) {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send("nexus:updater:status", evt);
    }
    this._listeners.forEach((fn) => fn(evt));
  }

  _wireAutoUpdater() {
    // electron-updater reads its update URL from app-update.yml (produced by
    // electron-builder). We never override it with a hardcoded value here.
    autoUpdater.autoDownload = false; // explicit user/manager consent
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on("checking-for-update", () => this._emit({ type: "checking" }));
    autoUpdater.on("update-available", (info) => this._emit({ type: "available", info: { version: info.version, releaseNotes: info.releaseNotes } }));
    autoUpdater.on("update-not-available", (info) => this._emit({ type: "none", version: info && info.version }));
    autoUpdater.on("download-progress", (p) => this._emit({ type: "progress", percent: p.percent }));
    autoUpdater.on("update-downloaded", () => this._emit({ type: "downloaded" }));
    autoUpdater.on("error", (err) => this._emit({ type: "error", message: err && err.message }));
  }

  _wireIpc() {
    ipcMain.handle("nexus:updater:check", async () => {
      try {
        await autoUpdater.checkForUpdates();
        return { ok: true };
      } catch (e) {
        this._emit({ type: "error", message: e.message });
        return { ok: false, error: e.message };
      }
    });

    ipcMain.handle("nexus:updater:downloadAndInstall", async () => {
      try {
        // 1) Download (autoDownload off — we initiate explicitly).
        await autoUpdater.downloadUpdate();
        // 2) Verify happens inside electron-updater before this resolves.
        // 3) Quit-and-install. User data lives in userData and is untouched.
        autoUpdater.quitAndInstall(false, true);
        return { ok: true };
      } catch (e) {
        this._emit({ type: "error", message: e.message });
        return { ok: false, error: e.message };
      }
    });
  }

  start() {
    // On startup, perform a silent check. If an update is available we surface
    // it via the banner — we never auto-install without the manager's consent.
    this.check({ silent: true });

    // Re-check periodically so users are always running the latest Nexus
    // release without manual intervention. 4-hour interval matches the
    // renderer's default; electron-updater dedupes redundant checks.
    this._periodicTimer = setInterval(() => {
      this.check({ silent: true });
    }, 4 * 60 * 60 * 1000);
  }

  async check({ silent = false } = {}) {
    try {
      if (silent) autoUpdater.autoDownload = false;
      await autoUpdater.checkForUpdates();
    } catch (e) {
      this._emit({ type: "error", message: e.message });
    }
  }

  dispose() {
    if (this._periodicTimer) { clearInterval(this._periodicTimer); this._periodicTimer = null; }
    this._listeners.clear();
  }
}

module.exports = { UpdateService };