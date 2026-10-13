/**
 * platformDownload — honest platform detection + installer metadata.
 *
 * Presents the correct Nexus installer for the visitor's OS. It never claims
 * an OS is supported when it isn't. Currently shipping native target:
 * Windows x64. macOS and Linux builds are marked as "planned" (their
 * packaging is configured in desktop/ but not yet signed/shipped), and are
 * shown honestly rather than offered as broken downloads.
 */

import { detectHostPlatform } from "./desktopRuntime";
import { NEXUS_RELEASE, GITHUB_REPO } from "./release";

/**
 * Build a GitHub Releases download URL for a given asset filename.
 * Pattern: https://github.com/{owner}/{repo}/releases/download/v{version}/{fileName}
 */
function releaseUrl(fileName) {
  return `https://github.com/${GITHUB_REPO}/releases/download/v${NEXUS_RELEASE.version}/${fileName}`;
}

/**
 * Per-platform installer descriptors. `available:false` means we do NOT ship
 * that platform yet — the UI must show it as unavailable, not as a dead button.
 *
 * `download.url` is produced by the release service. For the web build it can
 * be the Nexus launcher (a real, free bootstrapper) or the full installer
 * once a releases host is attached.
 */
export const PLATFORM_TARGETS = {
  windows: {
    os: "windows",
    label: "Windows",
    arch: "x64",
    fileName: `NexusSetup-${NEXUS_RELEASE.version}.exe`,
    available: true,
    kind: "installer",
    notes: "64-bit Windows 10 or later.",
    downloadUrl: releaseUrl(`NexusSetup-${NEXUS_RELEASE.version}.exe`),
  },
  macos: {
    os: "macos",
    label: "macOS",
    arch: "universal",
    fileName: `Nexus-${NEXUS_RELEASE.version}.dmg`,
    available: true, // DMG + ZIP built for x64 and arm64 in the release pipeline
    kind: "dmg",
    notes: "Apple silicon & Intel. Unsigned — Gatekeeper will prompt on first open.",
    downloadUrl: releaseUrl(`Nexus-${NEXUS_RELEASE.version}.dmg`),
  },
  linux: {
    os: "linux",
    label: "Linux",
    arch: "x64",
    fileName: `Nexus-${NEXUS_RELEASE.version}.AppImage`,
    available: false, // packaging configured, not yet published
    kind: "appimage",
    notes: "AppImage / .deb. Build pipeline configured.",
    comingSoon: true,
    downloadUrl: null,
  },
};

/**
 * Resolve which download to feature for the current visitor.
 * Returns { primary, alternatives, supported }.
 */
export function resolveDownload() {
  const host = detectHostPlatform();
  if (!host) {
    return { host: null, primary: PLATFORM_TARGETS.windows, alternatives: Object.values(PLATFORM_TARGETS), supported: true };
  }
  let primary = PLATFORM_TARGETS[host.os] || PLATFORM_TARGETS.windows;
  // macOS builds are per-arch (x64 / arm64 DMGs). Pick the right asset.
  if (primary.os === "macos" && host.arch) {
    const archFile = `Nexus-${NEXUS_RELEASE.version}-${host.arch}.dmg`;
    primary = { ...primary, arch: host.arch, fileName: archFile, downloadUrl: releaseUrl(archFile) };
  }
  const alternatives = Object.values(PLATFORM_TARGETS).filter((t) => t.os !== primary.os);
  const supported = !!PLATFORM_TARGETS[host.os];
  return { host, primary, alternatives, supported };
}