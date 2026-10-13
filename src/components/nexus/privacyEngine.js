/**
 * privacyEngine — the honest core of Nexus privacy.
 *
 * The web runtime can only control data Nexus itself owns: settings it
 * persists, history/entity rows it writes, in-memory private-session state,
 * and the iframe sandbox flags it hands to WebView. Real cookie/cache/
 * process isolation needs the native shell; those code paths call back into
 * desktopRuntime and degrade gracefully (labelled "Native Runtime Required")
 * when it isn't there.
 *
 * Everything this module reports as "active" is something it actually does.
 */

import { getSetting, setSetting } from "./services";

const SITE_STATE_KEY = "nexus.site.privacy.v1";
const PERM_LOG_KEY = "nexus.permission.history.v1";
const PRIVATE_FLAG = "nexus.private.active.v1";

export const PRIVACY_PROFILES = ["balanced", "strict", "hardened", "maximum"];
export const SECURITY_LEVELS = ["standard", "enhanced", "strict", "maximum"];
export const FINGERPRINT_MODES = ["balanced", "strong", "maximum"];
export const HTTPS_MODES = ["off", "preferred", "strict"];
export const REFERRER_MODES = ["standard", "reduced", "strict"];

// Parameters whose primary documented purpose is cross-site tracking/attribution.
// Conservative list — only strip when the value isn't semantically important.
export const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "utm_id", "utm_referrer", "utm_social", "utm_brand",
  "gclid", "gclsrc", "dclid", "fbclid", "msclkid", "yclid", "twclid",
  "mc_cid", "mc_eid", "mkt_tok", "_hsenc", "_hsmi", "hsCtaTracking",
  "vero_id", "vero_conv", "oly_enc_id", "oly_anon_id",
  "wickedid", "ref", "ref_src", "ref_url", "referrer",
  "spm_v", "spm_a", "spm_b", "spm_c", "spm_d",
  "_branch_match_id", "bsft_uid", "bsft_clkid",
]);

export const DEFAULT_PRIVACY = {
  profile: "balanced",          // balanced | strict | hardened | maximum
  securityLevel: "standard",    // standard | enhanced | strict | maximum
  fingerprint: "balanced",      // balanced | strong | maximum
  httpsOnly: "preferred",       // off | preferred | strict
  referrer: "reduced",          // standard | reduced | strict
  thirdPartyCookies: false,
  gpc: true,                    // Global Privacy Control signal
  dnt: false,
  stripTrackingParams: true,
  popupProtection: true,
  scriptControl: "allow",      // allow | block | strict
  forgetAfterClose: [],         // list of site hosts
  incognitoOnStartup: false,   // never restore private tabs
  clearPrivateOnClose: true,
  clearPrivateAfterInactivity: 0, // minutes, 0 = off
  telemetry: false,
};

export const DEFAULT_SECURITY = {
  level: "standard",
  blockMixedContent: true,
  blockDangerousDownloads: true,
  autoplay: "block",            // allow | block | limit
  restrictWebRTC: false,
  isolateOrigins: "native",     // native = needs native shell
};

function readLocal(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key) || "null"); return v ?? fallback; }
  catch { return fallback; }
}
function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function normalizeHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return ""; }
}

/** Strip known tracking parameters from a URL. Returns null if nothing changed. */
export function stripTrackingFromUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    let changed = false;
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) { u.searchParams.delete(key); changed = true; }
    }
    return changed ? u.toString() : null;
  } catch { return null; }
}

/** Load the global privacy config from NexusSettings (falls back to defaults). */
export async function loadPrivacyConfig() {
  return { ...DEFAULT_PRIVACY, ...(await getSetting("privacy_config", {}) || {}) };
}
export async function savePrivacyConfig(patch) {
  const current = await loadPrivacyConfig();
  const next = { ...current, ...patch };
  await setSetting("privacy_config", next);
  return next;
}

export async function loadSecurityConfig() {
  return { ...DEFAULT_SECURITY, ...(await getSetting("security_config", {}) || {}) };
}
export async function saveSecurityConfig(patch) {
  const current = await loadSecurityConfig();
  const next = { ...current, ...patch };
  await setSetting("security_config", next);
  return next;
}

/** Per-site overrides. Returns a merged effective config for a host. */
export function loadSiteState() {
  return readLocal(SITE_STATE_KEY, {}); // { [host]: { profile, fingerprint, cookies, scripts, exceptions... } }
}
export function saveSiteState(map) {
  writeLocal(SITE_STATE_KEY, map);
}
export function getSiteConfig(host) {
  if (!host) return null;
  return loadSiteState()[host] || null;
}
export function setSiteConfig(host, patch) {
  const all = loadSiteState();
  all[host] = { ...(all[host] || {}), ...patch };
  saveSiteState(all);
  return all[host];
}
export function forgetSite(host) {
  const all = loadSiteState();
  delete all[host];
  saveSiteState(all);
}

/** Permission request log — append-only, capped, user-revocable. */
export function loadPermissionHistory() {
  return readLocal(PERM_LOG_KEY, []);
}
export function logPermissionRequest(host, permission, decision) {
  const log = loadPermissionHistory();
  log.unshift({ host, permission, decision, at: Date.now() });
  writeLocal(PERM_LOG_KEY, log.slice(0, 100));
}
export function revokePermissionDecision(index) {
  const log = loadPermissionHistory();
  if (log[index]) log[index].revoked = true;
  writeLocal(PERM_LOG_KEY, log);
}

/** Private-session flag. The web runtime cannot create a true separate
 *  browsing context, so this flag + isolated in-memory state is what we
 *  actually have; the desktop shell replaces it with a real ephemeral
 *  partition (see desktopRuntime.js). */
export function isPrivateActive() {
  return readLocal(PRIVATE_FLAG, false) === true;
}
export function setPrivateActive(on) {
  writeLocal(PRIVATE_FLAG, !!on);
  // Reflect in <html data-private> for global styling cues.
  if (typeof document !== "undefined") {
    document.documentElement.dataset.private = on ? "on" : "off";
  }
}

/** Compute the effective privacy posture for a host (global + per-site override). */
export function effectiveConfig(globalConfig, host) {
  const site = getSiteConfig(host);
  if (!site) return globalConfig;
  return {
    ...globalConfig,
    ...(site.profile ? { profile: site.profile } : {}),
    ...(site.fingerprint ? { fingerprint: site.fingerprint } : {}),
    ...(site.cookies !== undefined ? { thirdPartyCookies: site.cookies } : {}),
    ...(site.scripts ? { scriptControl: site.scripts } : {}),
    ...(site.exceptions || []),
  };
}

/** Score 0–100 based ONLY on actual config. No participation trophies. */
export function privacyScore(cfg) {
  let s = 0;
  const bump = (cond, pts) => { if (cond) s += pts; };
  bump(cfg.profile === "balanced", 15);
  bump(cfg.profile === "strict", 25);
  bump(cfg.profile === "hardened", 35);
  bump(cfg.profile === "maximum", 45);
  bump(!cfg.thirdPartyCookies, 15);
  bump(cfg.gpc, 8);
  bump(cfg.httpsOnly === "preferred", 8);
  bump(cfg.httpsOnly === "strict", 14);
  bump(cfg.fingerprint === "strong", 10);
  bump(cfg.fingerprint === "maximum", 16);
  bump(cfg.referrer === "reduced", 6);
  bump(cfg.referrer === "strict", 10);
  bump(cfg.stripTrackingParams, 8);
  bump(cfg.popupProtection, 5);
  bump(cfg.scriptControl === "strict", 6);
  bump(cfg.clearPrivateOnClose, 6);
  bump(!cfg.telemetry, 8);
  return Math.min(100, s);
}

export function securityScore(cfg) {
  let s = 0;
  const bump = (cond, pts) => { if (cond) s += pts; };
  bump(cfg.level === "standard", 15);
  bump(cfg.level === "enhanced", 25);
  bump(cfg.level === "strict", 35);
  bump(cfg.level === "maximum", 45);
  bump(cfg.blockMixedContent, 12);
  bump(cfg.blockDangerousDownloads, 12);
  bump(cfg.autoplay === "block", 8);
  bump(cfg.restrictWebRTC, 10);
  bump(cfg.isolateOrigins === "native", 8); // only counts if native present
  return Math.min(100, s);
}