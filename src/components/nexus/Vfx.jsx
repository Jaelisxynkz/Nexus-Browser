import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNexusSettings } from "./useNexusSettings";

/**
 * Performance-aware VFX system.
 *
 * Quality tiers:
 *   performance — minimal VFX (no blur, no animations)
 *   balanced    — normal premium effects
 *   high        — richer blur, lighting, animations
 *   ultra       — maximum visual quality
 *
 * The effective tier also respects prefers-reduced-motion and is clamped down on
 * low-power / mobile / coarse pointers automatically via prefers-reduced-motion
 * and coarse-pointer media queries.
 *
 * Components consume quality via useVfx() and decide which layers to render.
 * No VFX is ever rendered inline via arbitrary values; everything keys off
 * the document-level data-vfx attribute set by the settings provider.
 */

const VfxContext = createContext({ tier: "balanced", reduced: false, max: 3 });

const TIER_ORDER = ["performance", "balanced", "high", "ultra"];
const TIER_INDEX = Object.fromEntries(TIER_ORDER.map((t, i) => [t, i]));

export function VfxProvider({ children }) {
  const { settings } = useNexusSettings();
  const [systemTier, setSystemTier] = useState("balanced");
  const [reduced, setReduced] = useState(false);

  // Watch prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // Clamp tier for low-power devices (coarse pointer + limited cores heuristic)
  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const lowPower = coarse && (
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
      /Android|iPhone|iPad/i.test(navigator.userAgent)
    );
    if (lowPower) setSystemTier("balanced");
    else setSystemTier("high");
  }, []);

  const value = useMemo(() => {
    const userTier = settings.reducedMotion ? "performance" : (settings.vfxQuality || "balanced");
    // effective = min(userTier, systemTier)
    const userIdx = TIER_INDEX[userTier] ?? 1;
    const sysIdx = TIER_INDEX[systemTier] ?? 1;
    const effective = TIER_ORDER[Math.min(userIdx, sysIdx)];
    return {
      tier: effective,
      userTier,
      reduced,
      level: TIER_INDEX[effective],
      max: (idx) => TIER_INDEX[effective] >= idx,
    };
  }, [settings.reducedMotion, settings.vfxQuality, systemTier, reduced]);

  return <VfxContext.Provider value={value}>{children}</VfxContext.Provider>;
}

export function useVfx() {
  return useContext(VfxContext);
}

export default VfxProvider;