import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { getSetting, setSetting } from "./services";

/**
 * Theme presets. Each maps to a set of CSS variable overrides applied to :root.
 */
export const THEMES = {
  midnight: {
    label: "Nexus Midnight",
    vars: {
      "--background": "228 38% 4%", "--foreground": "224 38% 93%",
      "--card": "228 48% 7%", "--card-foreground": "224 38% 93%",
      "--popover": "228 48% 7%", "--popover-foreground": "224 38% 93%",
      "--primary": "217 91% 60%", "--primary-foreground": "0 0% 100%",
      "--secondary": "227 48% 11%", "--secondary-foreground": "224 38% 93%",
      "--muted": "228 46% 10%", "--muted-foreground": "227 21% 62%",
      "--accent": "217 91% 60%", "--accent-foreground": "0 0% 100%",
      "--destructive": "349 89% 60%", "--destructive-foreground": "0 0% 100%",
      "--border": "220 40% 18%", "--input": "228 46% 12%", "--ring": "217 91% 60%",
      "--chart-1": "220 70% 50%", "--chart-2": "160 60% 45%", "--chart-3": "30 80% 55%",
      "--chart-4": "280 65% 60%", "--chart-5": "340 75% 55%",
      "--sidebar-background": "227 48% 5%", "--sidebar-foreground": "223 36% 88%",
      "--sidebar-primary": "217 91% 60%", "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "227 48% 11%", "--sidebar-accent-foreground": "0 0% 100%",
      "--sidebar-border": "220 40% 16%", "--sidebar-ring": "217 91% 60%",
    },
  },
  aurora: {
    label: "Nexus Aurora",
    vars: {
      "--background": "255 40% 6%", "--foreground": "260 40% 94%",
      "--card": "255 42% 9%", "--card-foreground": "260 40% 94%",
      "--popover": "255 42% 9%", "--popover-foreground": "260 40% 94%",
      "--primary": "280 90% 65%", "--primary-foreground": "0 0% 100%",
      "--secondary": "255 40% 14%", "--secondary-foreground": "260 40% 94%",
      "--muted": "255 38% 12%", "--muted-foreground": "258 20% 65%",
      "--accent": "190 90% 55%", "--accent-foreground": "255 40% 8%",
      "--destructive": "349 89% 62%", "--destructive-foreground": "0 0% 100%",
      "--border": "260 35% 22%", "--input": "255 38% 14%", "--ring": "280 90% 65%",
      "--chart-1": "280 70% 55%", "--chart-2": "190 80% 50%", "--chart-3": "330 75% 60%",
      "--chart-4": "220 70% 55%", "--chart-5": "30 80% 55%",
      "--sidebar-background": "255 42% 5%", "--sidebar-foreground": "260 30% 86%",
      "--sidebar-primary": "280 90% 65%", "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "255 40% 14%", "--sidebar-accent-foreground": "260 40% 94%",
      "--sidebar-border": "260 35% 20%", "--sidebar-ring": "280 90% 65%",
    },
  },
  ocean: {
    label: "Nexus Ocean",
    vars: {
      "--background": "210 55% 6%", "--foreground": "205 40% 93%",
      "--card": "210 55% 9%", "--card-foreground": "205 40% 93%",
      "--popover": "210 55% 9%", "--popover-foreground": "205 40% 93%",
      "--primary": "199 89% 55%", "--primary-foreground": "0 0% 100%",
      "--secondary": "210 50% 14%", "--secondary-foreground": "205 40% 93%",
      "--muted": "210 50% 12%", "--muted-foreground": "205 22% 62%",
      "--accent": "173 80% 45%", "--accent-foreground": "210 55% 6%",
      "--destructive": "349 89% 60%", "--destructive-foreground": "0 0% 100%",
      "--border": "205 45% 20%", "--input": "210 50% 14%", "--ring": "199 89% 55%",
      "--chart-1": "199 80% 50%", "--chart-2": "173 70% 45%", "--chart-3": "230 60% 55%",
      "--chart-4": "160 60% 45%", "--chart-5": "340 70% 55%",
      "--sidebar-background": "210 55% 5%", "--sidebar-foreground": "205 30% 86%",
      "--sidebar-primary": "199 89% 55%", "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "210 50% 14%", "--sidebar-accent-foreground": "205 40% 93%",
      "--sidebar-border": "205 45% 18%", "--sidebar-ring": "199 89% 55%",
    },
  },
  neon: {
    label: "Nexus Neon",
    vars: {
      "--background": "240 30% 4%", "--foreground": "150 30% 93%",
      "--card": "240 30% 7%", "--card-foreground": "150 30% 93%",
      "--popover": "240 30% 7%", "--popover-foreground": "150 30% 93%",
      "--primary": "160 100% 45%", "--primary-foreground": "240 30% 4%",
      "--secondary": "240 28% 12%", "--secondary-foreground": "150 30% 93%",
      "--muted": "240 26% 10%", "--muted-foreground": "150 18% 62%",
      "--accent": "300 100% 60%", "--accent-foreground": "0 0% 100%",
      "--destructive": "0 100% 60%", "--destructive-foreground": "0 0% 100%",
      "--border": "160 50% 20%", "--input": "240 28% 12%", "--ring": "160 100% 45%",
      "--chart-1": "160 80% 45%", "--chart-2": "300 80% 55%", "--chart-3": "190 80% 50%",
      "--chart-4": "340 75% 55%", "--chart-5": "60 90% 55%",
      "--sidebar-background": "240 30% 5%", "--sidebar-foreground": "150 25% 86%",
      "--sidebar-primary": "160 100% 45%", "--sidebar-primary-foreground": "240 30% 4%",
      "--sidebar-accent": "240 28% 12%", "--sidebar-accent-foreground": "150 30% 93%",
      "--sidebar-border": "160 50% 18%", "--sidebar-ring": "160 100% 45%",
    },
  },
  puredark: {
    label: "Nexus Pure Dark",
    vars: {
      "--background": "0 0% 4%", "--foreground": "0 0% 93%",
      "--card": "0 0% 7%", "--card-foreground": "0 0% 93%",
      "--popover": "0 0% 7%", "--popover-foreground": "0 0% 93%",
      "--primary": "217 91% 60%", "--primary-foreground": "0 0% 100%",
      "--secondary": "0 0% 12%", "--secondary-foreground": "0 0% 93%",
      "--muted": "0 0% 10%", "--muted-foreground": "0 0% 58%",
      "--accent": "217 91% 60%", "--accent-foreground": "0 0% 100%",
      "--destructive": "349 89% 60%", "--destructive-foreground": "0 0% 100%",
      "--border": "0 0% 18%", "--input": "0 0% 12%", "--ring": "217 91% 60%",
      "--chart-1": "217 91% 55%", "--chart-2": "160 60% 45%", "--chart-3": "30 80% 55%",
      "--chart-4": "280 65% 60%", "--chart-5": "340 75% 55%",
      "--sidebar-background": "0 0% 5%", "--sidebar-foreground": "0 0% 86%",
      "--sidebar-primary": "217 91% 60%", "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "0 0% 12%", "--sidebar-accent-foreground": "0 0% 93%",
      "--sidebar-border": "0 0% 16%", "--sidebar-ring": "217 91% 60%",
    },
  },
  light: {
    label: "Nexus Light",
    vars: {
      "--background": "220 30% 97%", "--foreground": "224 40% 12%",
      "--card": "0 0% 100%", "--card-foreground": "224 40% 12%",
      "--popover": "0 0% 100%", "--popover-foreground": "224 40% 12%",
      "--primary": "217 91% 55%", "--primary-foreground": "0 0% 100%",
      "--secondary": "220 20% 92%", "--secondary-foreground": "224 40% 12%",
      "--muted": "220 15% 90%", "--muted-foreground": "220 12% 42%",
      "--accent": "217 91% 55%", "--accent-foreground": "0 0% 100%",
      "--destructive": "349 80% 55%", "--destructive-foreground": "0 0% 100%",
      "--border": "220 15% 82%", "--input": "220 15% 88%", "--ring": "217 91% 55%",
      "--chart-1": "217 91% 50%", "--chart-2": "160 60% 42%", "--chart-3": "30 80% 50%",
      "--chart-4": "280 65% 55%", "--chart-5": "340 75% 52%",
      "--sidebar-background": "220 25% 95%", "--sidebar-foreground": "224 30% 25%",
      "--sidebar-primary": "217 91% 55%", "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "220 20% 90%", "--sidebar-accent-foreground": "224 40% 12%",
      "--sidebar-border": "220 15% 80%", "--sidebar-ring": "217 91% 55%",
    },
  },
};

const DEFAULT_THEME = "midnight";
const THEME_KEYS = Object.keys(THEMES);

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(DEFAULT_THEME);

  useEffect(() => {
    getSetting("theme", DEFAULT_THEME).then((t) => {
      if (THEMES[t]) setThemeState(t);
    });
  }, []);

  useEffect(() => {
    const t = THEMES[theme] || THEMES[DEFAULT_THEME];
    const root = document.documentElement;
    Object.entries(t.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }, [theme]);

  const setTheme = useCallback((t) => {
    if (!THEMES[t]) return;
    setThemeState(t);
    setSetting("theme", t).catch(() => {});
  }, []);

  const cycleTheme = useCallback(() => {
    const idx = THEME_KEYS.indexOf(theme);
    const next = THEME_KEYS[(idx + 1) % THEME_KEYS.length];
    setTheme(next);
    return THEMES[next].label;
  }, [theme, setTheme]);

  const value = useMemo(() => ({ theme, setTheme, cycleTheme, themes: THEMES }), [theme, setTheme, cycleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback for any consumer still treating this as a hook outside provider
    return { theme: DEFAULT_THEME, setTheme: () => {}, cycleTheme: () => "", themes: THEMES };
  }
  return ctx;
}