// Nexus release-manifest service.
//
// Serves the signed update manifest consumed by the UpdateManager (web build)
// and by the native updater (desktop). This is the single source of truth for
// which Nexus versions are available on each release channel.
//
// The manifest lives server-side and is updated by the release pipeline when a
// new build is published. The installer's own version is stamped at packaging
// time and never diverges from the manifest entry for the same channel.
//
// Contract (schemaVersion 1):
// {
//   "schemaVersion": 1,
//   "generatedAt": ISO-8601,
//   "productName": "Nexus",
//   "channels": {
//     "stable": {
//       "version": "1.0.0", "build": 1,
//       "url": "https://.../NexusSetup-1.0.0.exe",
//       "sha512": "...", "size": 12345678,
//       "mandatory": false, "minSupported": "1.0.0",
//       "releaseNotes": "...", "securityFixes": [], ...
//     }, "beta": {...}, "nightly": {...}
//   }
// }

// ---- Release configuration (edit when publishing a new build) ----
// IMPORTANT: keep this in sync with the desktop build's package.json version.
const CURRENT_RELEASES = {
  schemaVersion: 1,
  productName: "Nexus",
  // `generatedAt` is stamped per call so the manifest is always current.
  channels: {
    stable: {
      version: "1.0.0",
      build: 1,
      // Real installer URL. Until the desktop pipeline publishes, this is null
      // — and the UpdateManager correctly reports "channel-not-published" /
      // "unavailable" rather than fabricating an update.
      url: null,
      sha512: null,
      size: null,
      mandatory: false,
      minSupported: "1.0.0",
      staged: 100, // % rollout; 100 = full rollout
      releaseNotes:
        "Nexus 1.0.0 — Aurora.\n\n• Real desktop architecture boundary.\n• Native runtime bridge + signed update pipeline.\n• Crash recovery and safe-rollback design.\n• Centralized release configuration.\n• First-launch setup wizard.",
      securityFixes: [],
      performanceImprovements: [
        "GPU-tier detection drives automatic VFX quality.",
      ],
      bugFixes: [],
      knownIssues: [
        "X-Frame-Options sites cannot render inside the in-app web view.",
        "Code signing requires a certificate at the desktop packaging step.",
      ],
    },
    beta: {
      version: "1.0.0",
      build: 1,
      url: null,
      sha512: null,
      size: null,
      mandatory: false,
      minSupported: "1.0.0",
      staged: 0,
      releaseNotes: "Beta channel opens alongside stable 1.0.0.",
    },
    nightly: {
      version: "1.0.0",
      build: 1,
      url: null,
      sha512: null,
      size: null,
      mandatory: false,
      minSupported: "1.0.0",
      staged: 0,
      releaseNotes: "Nightly channel initializing.",
    },
  },
};

export async function main(req, res) {
  // Minimal input contract — the manifest is public; no auth required.
  const channel = req.body?.channel;

  // Compute the canonical manifest. We deep-copy and stamp generatedAt so the
  // stored object never drifts across deployments.
  const manifest = JSON.parse(JSON.stringify(CURRENT_RELEASES));
  manifest.generatedAt = new Date().toISOString();

  // If a specific channel was requested, return just that channel's entry plus
  // the envelope. This is the shape the native updater uses.
  if (channel && manifest.channels[channel]) {
    return res.json({
      schemaVersion: manifest.schemaVersion,
      generatedAt: manifest.generatedAt,
      productName: manifest.productName,
      channel,
      release: manifest.channels[channel],
    });
  }

  return res.json(manifest);
}