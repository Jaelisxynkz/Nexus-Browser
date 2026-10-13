/**
 * Nexus Design System — the single source of truth for visual language.
 *
 * Every surface in Nexus derives its spacing, radius, shadow, blur, glow,
 * motion, and hierarchy from these tokens. Individual pages and components
 * must NOT invent their own scales.
 *
 * This module is intentionally framework-agnostic (plain data + helpers) so
 * it can be consumed from any component without import cycles.
 */

/* ------------------------------------------------------------------ */
/* SPACING                                                             */
/* ------------------------------------------------------------------ */
export const SPACE = {
  0: "0px",
  px: "1px",
  0.5: "2px",
  1: "4px",
  1.5: "6px",
  2: "8px",
  2.5: "10px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
  24: "96px",
};

/* ------------------------------------------------------------------ */
/* RADIUS                                                              */
/* ------------------------------------------------------------------ */
export const RADIUS = {
  none: "0px",
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "20px",
  "3xl": "24px",
  pill: "9999px",
};

/* ------------------------------------------------------------------ */
/* TYPOGRAPHY SCALE                                                    */
/* ------------------------------------------------------------------ */
export const TYPE = {
  /** size / lineHeight (em) / tracking (em) / weight */
  display: { size: "104px", line: "0.95", track: "0.02em", weight: 700 },
  h1: { size: "28px", line: "1.15", track: "-0.01em", weight: 600 },
  h2: { size: "20px", line: "1.2", track: "-0.005em", weight: 600 },
  h3: { size: "16px", line: "1.3", track: "0", weight: 600 },
  body: { size: "14px", line: "1.5", track: "0", weight: 400 },
  bodySm: { size: "13px", line: "1.45", track: "0", weight: 400 },
  caption: { size: "12px", line: "1.4", track: "0", weight: 400 },
  micro: { size: "10px", line: "1.35", track: "0.04em", weight: 500 },
  kbd: { size: "10px", line: "1", track: "0", weight: 500 },
};

/* ------------------------------------------------------------------ */
/* SHADOWS — layered, subtle, premium                                  */
/* ------------------------------------------------------------------ */
export const SHADOW = {
  xs: "0 1px 2px rgba(0,0,0,0.18)",
  sm: "0 2px 6px rgba(0,0,0,0.22)",
  md: "0 6px 18px rgba(0,0,0,0.28)",
  lg: "0 12px 36px rgba(0,0,0,0.34)",
  xl: "0 24px 64px rgba(0,0,0,0.42)",
  /** accent glow keyed off the brand indigo */
  glowAccent: "0 0 18px hsl(var(--accent) / 0.35)",
  glowAccentStrong: "0 0 28px hsl(var(--accent) / 0.55)",
  ringAccent: "inset 0 0 0 1px hsl(var(--accent) / 0.35)",
};

/* ------------------------------------------------------------------ */
/* GLASS — backdrop blur + tint levels                                 */
/* ------------------------------------------------------------------ */
export const GLASS = {
  none: "none",
  subtle: "blur(6px) saturate(120%)",
  standard: "blur(14px) saturate(140%)",
  heavy: "blur(24px) saturate(160%)",
};

/* ------------------------------------------------------------------ */
/* ICON SIZES — one scale, used everywhere                              */
/* ------------------------------------------------------------------ */
export const ICON = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  "2xl": 28,
};

/* ------------------------------------------------------------------ */
/* MOTION — durations + curves                                          */
/* ------------------------------------------------------------------ */
export const MOTION = {
  instant: 80,
  fast: 140,
  base: 200,
  slow: 300,
  deliberate: 480,
  curveStandard: "cubic-bezier(0.4, 0, 0.2, 1)",
  curveEntrance: "cubic-bezier(0.16, 1, 0.3, 1)",
  curveExit: "cubic-bezier(0.7, 0, 0.84, 0)",
  curveSpring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

/* ------------------------------------------------------------------ */
/* Z-INDEX LAYERS — depth system                                       */
/* ------------------------------------------------------------------ */
export const LAYER = {
  base: 0,
  raised: 10,
  sticky: 20,
  dropdown: 30,
  popover: 40,
  overlay: 50,
  modal: 60,
  command: 70,
  toast: 80,
  tooltip: 90,
};

/* ------------------------------------------------------------------ */
/* BUTTON HIERARCHY — class strings consumable directly                 */
/* ------------------------------------------------------------------ */
export const BTN = {
  ghost: "grid place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
  ghostActive: "grid place-items-center rounded-full bg-accent/15 text-accent",
  primary: "inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-accent-foreground transition hover:opacity-90",
  secondary: "inline-flex items-center justify-center gap-2 rounded-full bg-muted px-4 py-2 text-[13px] font-medium text-foreground transition hover:bg-muted/80",
  outline: "inline-flex items-center justify-center gap-2 rounded-full border border-border/50 px-4 py-2 text-[13px] font-medium text-foreground transition hover:border-accent/50 hover:bg-accent/5",
  danger: "inline-flex items-center justify-center gap-2 rounded-full bg-destructive/10 px-4 py-2 text-[13px] font-medium text-destructive transition hover:bg-destructive/20",
};

/* ------------------------------------------------------------------ */
/* PANEL HIERARCHY                                                     */
/* ------------------------------------------------------------------ */
export const PANEL = {
  surface: "bg-card border border-border/40",
  surfaceRaised: "bg-popover border border-border/50 shadow-lg",
  glass: "bg-sidebar/80 backdrop-blur-xl border border-border/40",
  inset: "bg-muted/40 border border-border/30 rounded-lg",
};

/* ------------------------------------------------------------------ */
/* FOCUS STATES                                                        */
/* ------------------------------------------------------------------ */
export const FOCUS_RING = "outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/* ------------------------------------------------------------------ */
/* HELPERS                                                             */
/* ------------------------------------------------------------------ */

/** Build a consistent control-height class string. */
export const controlHeight = (size = "md") => {
  const map = { xs: "h-6", sm: "h-7", md: "h-8", lg: "h-9", xl: "h-10" };
  return map[size] || map.md;
};