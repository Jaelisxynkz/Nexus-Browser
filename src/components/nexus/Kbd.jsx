import React from "react";

/**
 * Kbd — the standard keyboard hint chip used across the design system.
 */
export default function Kbd({ children, className = "" }) {
  return (
    <kbd
      className={`rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground ${className}`}
    >
      {children}
    </kbd>
  );
}