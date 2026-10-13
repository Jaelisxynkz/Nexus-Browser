/**
 * NexusRelease — centralized version & release-channel configuration.
 *
 * Single source of truth for the installed Nexus version, build metadata,
 * release channel, and update-channel definitions. No other module should
 * hardcode a version string — import from here.
 *
 * Design rule (per product spec): we never fabricate version or update state.
 * The `installed` value below describes THIS build of the web app shell.
 * The desktop installer build stamps its own version at packaging time and
 * overrides these values via the runtime bridge (see desktopRuntime.js).
 */

// GitHub repository that hosts releases. The CI pipeline pushes installer
// artifacts here as GitHub Releases. Used to construct download URLs and
// the auto-updater feed.
export const GITHUB_REPO = "Jaelisxynkz/Nexus-Browser";

export const NEXUS_RELEASE = {
  // Version of the Nexus product this source tree represents.
  // Overridden at build time by the CI pipeline via VITE_APP_VERSION (the git tag).
  version: import.meta.env.VITE_APP_VERSION || "1.0.0",
  // Monotonic build number (incremented per build, used for numeric compare).
  build: 1,
  // Codename shown in About / Update Center.
  codename: "Aurora",
  // ISO date this source build was produced.
  buildDate: "2026-10-03",
  // Human-readable release notes for this version.
  releaseNotes: [
    "Real desktop architecture boundary: native runtime bridge, signed update pipeline, and recovery system.",
    "Centralized release configuration — no hardcoded versions across UI.",
    "Update Center (nexus://updates) with live channel + integrity metadata.",
    "First-launch setup wizard with progressive disclosure.",
    "Crash recovery + safe-rollback architecture for user data separation.",
  ],
  securityFixes: [],
  performanceImprovements: [
    "GPU-tier detection drives automatic VFX quality on desktop startup.",
  ],
  bugFixes: [],
  knownIssues: [
    "X-Frame-Options sites cannot render inside the in-app web view (web build).",
    "Code signing requires a certificate provided at the desktop packaging step.",
  ],
};

export const RELEASE_CHANNELS = {
  stable: {
    id: "stable",
    label: "Stable",
    description: "Tested releases. Recommended for everyone.",
    risk: "low",
    default: true,
  },
  beta: {
    id: "beta",
    label: "Beta",
    description: "Preview builds with near-final features.",
    risk: "medium",
  },
  nightly: {
    id: "nightly",
    label: "Nightly",
    description: "Experimental builds — newest, least tested.",
    risk: "high",
  },
};

export const DEFAULT_CHANNEL = "stable";

/** Parse a semver-ish string into a comparable [major, minor, patch, build] tuple. */
export function parseVersion(v) {
  if (!v) return [0, 0, 0, 0];
  const m = String(v).match(/(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!m) return [0, 0, 0, 0];
  return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4] || 0)];
}

/** Returns 1 if a > b, -1 if a < b, 0 if equal. */
export function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 4; i++) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
  }
  return 0;
}

/** True if `candidate` is newer than `installed`. */
export function isNewer(candidate, installed) {
  return compareVersions(candidate, installed) > 0;
}

/** Format a version for display: "1.0.0" or "1.0.0 (build 42)". */
export function formatVersion(v, build) {
  return build ? `${v} (build ${build})` : v;
}