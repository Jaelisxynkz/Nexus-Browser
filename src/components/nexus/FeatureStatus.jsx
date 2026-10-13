import React, { createContext, useContext, useMemo } from "react";

/**
 * Global feature-status system for Nexus.
 *
 * Centralizes the availability state of every browser feature so the UI never
 * pretends something works that doesn't. Each feature has a real status:
 *   available  — works now in this runtime
 *   native     — requires the native Nexus shell (marked "Native Runtime Required")
 *   coming     — planned but not yet implemented
 *
 * Components consume via useFeatureStatus() and render consistent status badges.
 */

const NATIVE_FEATURES = new Set([
  "vpn",
  "extensions",
  "localModels",
  "downloads",
  "websitePanels",
  "forceInstall",
  "downloadsFolder",
  "importBookmarks",
  "pushNotifications",
  "clipboardWrite",
]);

const COMING_FEATURES = new Set([
  "sync",
  "readingList",
]);

const FeatureStatusContext = createContext(null);

export function FeatureStatusProvider({ children }) {
  const status = useMemo(() => {
    const map = {};
    const all = new Set([...NATIVE_FEATURES, ...COMING_FEATURES]);
    all.forEach((f) => {
      if (NATIVE_FEATURES.has(f)) map[f] = "native";
      else if (COMING_FEATURES.has(f)) map[f] = "coming";
      else map[f] = "available";
    });
    return map;
  }, []);

  const get = (feature) => status[feature] || "available";
  const isAvailable = (feature) => get(feature) === "available";
  const isNative = (feature) => get(feature) === "native";
  const isComing = (feature) => get(feature) === "coming";

  const value = useMemo(() => ({ status, get, isAvailable, isNative, isComing }), [status, get, isAvailable, isNative, isComing]);
  return <FeatureStatusContext.Provider value={value}>{children}</FeatureStatusContext.Provider>;
}

export function useFeatureStatus() {
  return useContext(FeatureStatusContext);
}

export const STATUS_LABELS = {
  available: "Available",
  native: "Native Runtime Required",
  coming: "Coming Soon",
  enabled: "Enabled",
  disabled: "Disabled",
  loading: "Loading",
  error: "Error",
};

export const STATUS_TONES = {
  available: "emerald",
  native: "amber",
  coming: "sky",
  enabled: "emerald",
  disabled: "slate",
  loading: "blue",
  error: "red",
};