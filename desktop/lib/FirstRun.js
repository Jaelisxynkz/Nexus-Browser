/**
 * FirstRun — reliable first-launch detection.
 *
 * The welcome screen must appear ONLY for a genuinely new installation.
 * It must NOT reappear on restart, update, or window recreation. We achieve
 * this by writing a completion marker file to the user-data directory the
 * first time the user completes or skips the wizard.
 *
 * The marker is independent of settings.json so that resetting settings
 * (without resetting all browser data) does not retrigger the wizard.
 * Only an intentional profile reset (deleting userData) clears it.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MARKER_FILE = 'firstrun.done';

class FirstRun {
  constructor(userDataDir) {
    this._markerPath = path.join(userDataDir, MARKER_FILE);
  }

  /** True when the welcome wizard should be shown (no marker file exists). */
  isPending() {
    return !fs.existsSync(this._markerPath);
  }

  /** Mark the first-run as complete. Call when the user finishes or skips. */
  complete() {
    try {
      fs.writeFileSync(this._markerPath, JSON.stringify({
        completedAt: new Date().toISOString(),
        version: '1.0.0',
      }, null, 2));
    } catch (e) {
      console.error('[FirstRun] Failed to write marker:', e.message);
    }
  }

  /** Intentionally reset — only called when the user resets all browser data. */
  reset() {
    try { fs.unlinkSync(this._markerPath); } catch {}
  }
}

module.exports = { FirstRun };