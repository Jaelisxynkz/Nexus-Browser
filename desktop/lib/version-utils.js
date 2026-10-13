/**
 * version-utils — semver-ish comparison for the auto-updater.
 *
 * Used by the updater to decide whether a remote release is genuinely newer
 * than the installed version, preventing accidental downgrades or
 * repeated updates to the same version.
 */

'use strict';

/**
 * Parse a version string into a comparable numeric tuple.
 * Supports "1.2.3", "1.2.3.4", "v1.2.3", "1.2.3-beta.1".
 * Non-numeric segments after the first four are ignored for comparison.
 */
function parseVersion(v) {
  if (!v) return [0, 0, 0, 0];
  const m = String(v).replace(/^v/i, '').match(/(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!m) return [0, 0, 0, 0];
  return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4] || 0)];
}

/**
 * Compare two version strings.
 * Returns 1 if a > b, -1 if a < b, 0 if equal.
 */
function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 4; i++) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
  }
  return 0;
}

/** True if `candidate` is strictly newer than `installed`. */
function isNewer(candidate, installed) {
  return compareVersions(candidate, installed) > 0;
}

/** True if both versions are equal. */
function isSame(candidate, installed) {
  return compareVersions(candidate, installed) === 0;
}

module.exports = { parseVersion, compareVersions, isNewer, isSame };