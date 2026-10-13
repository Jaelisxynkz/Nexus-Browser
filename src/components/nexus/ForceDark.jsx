import React, { createContext, useContext, useEffect, useMemo, useCallback } from "react";
import { useNexusSettings } from "./useNexusSettings";
import { getSetting, setSetting } from "./services";

/**
 * Force Dark Mode for Websites — a serious browser-level feature.
 *
 * Separate from the Nexus UI theme. When enabled, the WebView iframe gets a
 * class that activates a CSS filter strategy layered with exclusions:
 *   - images, video, canvas, iframe embeds are NOT inverted (kept original)
 *   - elements already dark are protected via a hue-rotate + brightness combo
 *   - smart media handling excludes media when enabled
 *   - per-site overrides (always-on / always-off / follow-global) are persisted
 *
 * The actual darkening is applied via a stylesheet injected into the WebView
 * container (filter on the iframe element) plus a per-domain decision.
 */

const PER_SITE_KEY = "force_dark_sites";

function parsePerSite(raw) {
  try {
    const obj = raw || {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const ForceDarkContext = createContext(null);

export function ForceDarkProvider({ children }) {
  const { settings } = useNexusSettings();
  const globalMode = settings.websiteDarkMode || "off"; // off | on | auto
  const smartImages = settings.darkSmartImages !== false;
  const smartMedia = settings.darkSmartMedia !== false;
  const reduceBright = settings.darkReduceBright || false;
  const contrast = settings.darkContrast ?? 100;
  const brightness = settings.darkBrightness ?? 100;
  const saturation = settings.darkSaturation ?? 100;

  // Per-site overrides persisted in NexusSettings
  const [perSite, setPerSite] = React.useState({});
  const [loaded, setLoaded] = React.useState(false);

  const { update } = useNexusSettings();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await getSetting(PER_SITE_KEY, {});
        if (alive) setPerSite(parsePerSite(raw));
      } catch {}
      finally { if (alive) setLoaded(true); }
    })();
    return () => { alive = false; };
  }, []);

  const persistPerSite = useCallback((next) => {
    setPerSite(next);
    setSetting(PER_SITE_KEY, next).catch(() => {});
  }, []);

  const setGlobalMode = useCallback((mode) => {
    if (!["off", "on", "auto"].includes(mode)) return;
    update("websiteDarkMode", mode);
  }, [update]);

  const toggleGlobal = useCallback(() => {
    const next = globalMode === "off" ? "on" : "off";
    update("websiteDarkMode", next);
    return next;
  }, [globalMode, update]);

  // Decide the effective dark state for a given URL
  const effectiveForUrl = useCallback((url) => {
    const dom = domainOf(url);
    if (!dom) return false;
    const siteSetting = perSite[dom]; // "on" | "off" | "follow" | undefined
    const mode = siteSetting === "follow" || !siteSetting ? globalMode : (siteSetting === "on" ? "on" : "off");
    if (mode === "on") return true;
    if (mode === "auto") {
      // Respect prefers-color-scheme
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  }, [perSite, globalMode]);

  // Apply the force-dark stylesheet to the document head
  useEffect(() => {
    let style = document.getElementById("nexus-force-dark");
    if (!style) {
      style = document.createElement("style");
      style.id = "nexus-force-dark";
      document.head.appendChild(style);
    }
    const mediaExclude = smartMedia
      ? `iframe img, iframe video, iframe canvas, iframe svg, iframe picture, iframe embed, iframe object, iframe [style*="background-image"]`
      : `iframe img, iframe video, iframe canvas`;
    const imgExclude = smartImages
      ? `iframe img, iframe picture, iframe svg, iframe canvas`
      : `iframe img`;
    const reduce = reduceBright ? `filter: brightness(0.85) saturate(0.9);` : "";
    const css = `
      .nexus-force-dark-on iframe.nexus-webview {
        filter: invert(1) hue-rotate(180deg) brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%);
        ${reduce}
      }
      .nexus-force-dark-on iframe.nexus-webview img,
      .nexus-force-dark-on iframe.nexus-webview video,
      .nexus-force-dark-on iframe.nexus-webview canvas,
      .nexus-force-dark-on iframe.nexus-webview picture,
      .nexus-force-dark-on iframe.nexus-webview svg,
      .nexus-force-dark-on iframe.nexus-webview embed,
      .nexus-force-dark-on iframe.nexus-webview object {
        filter: invert(1) hue-rotate(180deg);
      }
    `;
    style.textContent = css;
  }, [smartImages, smartMedia, reduceBright, contrast, brightness, saturation]);

  const setSiteOverride = useCallback((domain, mode) => {
    const next = { ...perSite };
    if (mode === "follow" || !mode) delete next[domain];
    else next[domain] = mode;
    persistPerSite(next);
  }, [perSite, persistPerSite]);

  const getSiteOverride = useCallback((domain) => perSite[domain] || "follow", [perSite]);

  const value = useMemo(() => ({
    globalMode,
    smartImages,
    smartMedia,
    reduceBright,
    contrast,
    brightness,
    saturation,
    perSite,
    loaded,
    effectiveForUrl,
    setSiteOverride,
    getSiteOverride,
    setGlobalMode,
    toggleGlobal,
    isOn: globalMode !== "off",
  }), [globalMode, smartImages, smartMedia, reduceBright, contrast, brightness, saturation, perSite, loaded, effectiveForUrl, setSiteOverride, getSiteOverride, setGlobalMode, toggleGlobal]);

  return <ForceDarkContext.Provider value={value}>{children}</ForceDarkContext.Provider>;
}

export function useForceDark() {
  return useContext(ForceDarkContext);
}