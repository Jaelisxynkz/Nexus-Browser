/**
 * capabilityDetect — hardware / performance capability detection.
 *
 * On startup, detect real device capabilities and map them to a recommended
 * performance/VFX tier. Never hardcodes a specific PC. Values come from
 * genuine browser/OS signals (deviceMemory, hardwareConcurrency, GPU string,
 * reduced-motion, battery, network). Desktop shell augments this with native
 * GPU/CPU info via the bridge.
 */

import { bridgeOrNull } from "./desktopRuntime";

export const PERF_TIER = { LOW: "low", MEDIUM: "medium", HIGH: "high", ULTRA: "ultra" };

function scoreFromMemory(gb) {
  if (!gb) return 1;
  if (gb >= 16) return 4;
  if (gb >= 8) return 3;
  if (gb >= 4) return 2;
  return 1;
}

function scoreFromCores(n) {
  if (!n) return 1;
  if (n >= 12) return 4;
  if (n >= 8) return 3;
  if (n >= 4) return 2;
  return 1;
}

/** Detect GPU renderer string (best-effort, may be masked by the browser). */
function detectGpu() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return { renderer: null, score: 2 };
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    // Heuristic scoring from the renderer string.
    const r = (renderer || "").toLowerCase();
    let score = 2;
    if (/nvidia|geforce|rtx|gtx|radeon|rx |apple m|mali-g7|adreno 6|adreno 7/.test(r)) score = 4;
    else if (/intel iris|intel uhd|vega|adreno 5|mali-g5|apple/.test(r)) score = 3;
    else if (/swiftshader|llvmpipe|software/.test(r)) score = 1;
    return { renderer: renderer || null, score };
  } catch {
    return { renderer: null, score: 2 };
  }
}

/** Read the battery status (if exposed). */
async function detectBattery() {
  try {
    if (navigator.getBattery) {
      const b = await navigator.getBattery();
      return { supported: true, charging: b.charging, level: b.level };
    }
  } catch {}
  return { supported: false };
}

/** Read effective network quality (if exposed). */
function detectNetwork() {
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!c) return null;
  return { effectiveType: c.effectiveType, downlink: c.downlink, saveData: c.saveData };
}

/**
 * Run full capability detection. Returns a report + a recommended tier.
 */
export async function detectCapabilities() {
  const nav = typeof navigator !== "undefined" ? navigator : {};
  const memory = nav.deviceMemory || null;
  const cores = nav.hardwareConcurrency || null;
  const reducedMotion =
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const gpu = detectGpu();
  const battery = await detectBattery();
  const network = detectNetwork();

  // Native augmentation (desktop shell can provide exact GPU/CPU/power info).
  const bridge = bridgeOrNull();
  let native = null;
  if (bridge?.system?.info) {
    try { native = await bridge.system.info(); } catch {}
  }

  const memScore = scoreFromMemory(memory);
  const coreScore = scoreFromCores(cores);
  let total = memScore + coreScore + gpu.score; // 3..12

  if (reducedMotion) total -= 2;
  if (battery.supported && !battery.charging && battery.level < 0.25) total -= 1;
  if (network?.saveData) total -= 1;
  if (native?.lowPowerMode) total -= 1;

  let tier = PERF_TIER.MEDIUM;
  if (total >= 11) tier = PERF_TIER.ULTRA;
  else if (total >= 9) tier = PERF_TIER.HIGH;
  else if (total >= 6) tier = PERF_TIER.MEDIUM;
  else tier = PERF_TIER.LOW;

  return {
    memory,
    cores,
    gpu,
    battery,
    network,
    reducedMotion,
    native,
    score: total,
    recommendedTier: tier,
    // Suggested VFX quality mapping for the existing Vfx system.
    recommendedVfx:
      tier === PERF_TIER.ULTRA ? "ultra"
      : tier === PERF_TIER.HIGH ? "high"
      : tier === PERF_TIER.MEDIUM ? "balanced"
      : "performance",
  };
}