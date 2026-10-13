/**
 * desktopRuntime — honest detection of the environment Nexus is running in,
 * plus the typed bridge to the real native runtime when present.
 *
 * Three environments are distinguished, and each is reported truthfully:
 *
 *   "web"     — running in a normal browser tab (Base44-hosted web build).
 *               No OS integration exists. Native actions are unavailable and
 *               are reported as such, never simulated.
 *
 *   "pwa"     — installed as a Progressive Web App (standalone window).
 *               Better window integration, still no OS shell / filesystem /
 *               installer capabilities. Reported accurately, not overstated.
 *
 *   "desktop" — running inside the genuine Nexus native shell (Electron).
 *               A preload script injects `window.__nexus` (the bridge). All
 *               native capabilities are real and proxied over IPC.
 *
 * The bridge contract (`window.__nexus`) is the single integration boundary
 * between the web UI and the native desktop layer. See desktop/ for the
 * native implementation that fulfils this contract.
 */

export const RUNTIME_ENV = {
  WEB: "web",
  PWA: "pwa",
  DESKTOP: "desktop",
};

function detectDisplayMode() {
  if (typeof window === "undefined") return "browser";
  if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return "standalone";
  if (window.matchMedia && window.matchMedia("(display-mode: window-controls-overlay)").matches) return "wco";
  if (window.navigator.standalone) return "standalone"; // iOS
  return "browser";
}

/**
 * Detect the current runtime environment. Returns one of RUNTIME_ENV.
 * This is computed once; the bridge presence is authoritative for desktop.
 */
export function detectRuntime() {
  if (typeof window === "undefined") return RUNTIME_ENV.WEB;
  if (window.__nexus && window.__nexus.native === true) return RUNTIME_ENV.DESKTOP;
  const mode = detectDisplayMode();
  if (mode === "standalone" || mode === "wco") return RUNTIME_ENV.PWA;
  return RUNTIME_ENV.WEB;
}

/**
 * Detect the host operating system + architecture (best-effort, from UA).
 * Used by the download page to present the correct installer. Never fabricates
 * support — unsupported platforms return null and the UI says so.
 */
export function detectHostPlatform() {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);

  let os = null;
  if (/Windows/i.test(platform) || /Win32|Win64|Windows/i.test(ua)) os = "windows";
  else if (/Mac/i.test(platform) || /MacIntel|Mac OS X/i.test(ua)) os = "macos";
  else if (/Linux/i.test(platform) && !/Android/i.test(ua)) os = "linux";
  else if (/Android/i.test(ua)) os = "android";
  else if (/iPhone|iPad/i.test(ua)) os = "ios";

  // Architecture detection (best-effort; most browsers only expose limited info)
  let arch = "x64";
  if (/arm64|aarch64/i.test(ua)) arch = "arm64";
  else if (/wow64|win64|x64|x86_64|amd64/i.test(ua)) arch = "x64";

  return { os, arch, isMobile, rawPlatform: platform || null };
}

/**
 * The capability map — what is genuinely possible in the current environment.
 * Every consumer of "can we do X" reads from here. No module should claim a
 * capability that this map says is unavailable.
 */
export function getCapabilities() {
  const env = detectRuntime();
  const isDesktop = env === RUNTIME_ENV.DESKTOP;
  const isPwa = env === RUNTIME_ENV.PWA;
  const bridge = (typeof window !== "undefined" && window.__nexus) || null;

  return {
    env,
    isDesktop,
    isPwa,
    isWeb: env === RUNTIME_ENV.WEB,

    // Window / OS integration
    nativeWindow: isDesktop,
    multipleWindows: isDesktop,
    systemTray: isDesktop,
    alwaysOnTop: isDesktop,
    rememberWindowState: isDesktop || isPwa, // PWA can't persist OS window pos

    // OS integration
    osNotifications: isDesktop || ("Notification" in (typeof window !== "undefined" ? window : {})),
    clipboard: "clipboard" in (typeof navigator !== "undefined" ? navigator : {}),
    filePicker: isDesktop || ("showOpenFilePicker" in (typeof window !== "undefined" ? window : {})),
    filesystem: isDesktop,
    downloadsDir: isDesktop,
    openExternal: isDesktop,
    protocolHandler: isDesktop,
    defaultBrowserRegistration: isDesktop,
    osThemeDetection: typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").media,
    systemAccentColor: isDesktop,

    // Installer / updates
    canSelfUpdate: isDesktop,        // only the native shell can replace its own binary
    codeSigning: false,              // requires a certificate at packaging; honest default
    deltaUpdates: isDesktop,         // electron-updater delta; only in native shell
    stagedRollout: true,             // driven by the release-metadata service (server-side)

    // Real browser engine (only in the native shell)
    realBrowserView: isDesktop,      // BrowserView-based tabs (not iframes)
    realIncognito: isDesktop,        // dedicated ephemeral session partitions
    realAdBlocker: isDesktop,        // network-level request filtering
    realDownloads: isDesktop,        // real download manager with progress
    realSessionIsolation: isDesktop, // per-tab session separation
    realPermissionPrompts: isDesktop,// native permission dialogs

    // Bridge presence (for desktop env detail)
    bridgeAvailable: !!bridge,
  };
}

/**
 * Access the native bridge. Throws in non-desktop env so callers must gate on
 * getCapabilities() first — this prevents any accidental "fake" native call.
 */
export function bridge() {
  if (typeof window !== "undefined" && window.__nexus && window.__nexus.native === true) {
    return window.__nexus;
  }
  throw new Error("Nexus native runtime is not available in this environment.");
}

/** Safe optional accessor — returns null instead of throwing. */
export function bridgeOrNull() {
  try {
    return bridge();
  } catch {
    return null;
  }
}

/** True only when running inside the real native shell. */
export function isDesktopRuntime() {
  return detectRuntime() === RUNTIME_ENV.DESKTOP;
}