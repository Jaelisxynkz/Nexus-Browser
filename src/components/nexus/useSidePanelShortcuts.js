import { useEffect } from "react";

/**
 * useSidePanelShortcuts — keyboard control for the Web App Dock.
 *
 *   Ctrl+Shift+B  → toggle the dock open/closed
 *   Ctrl+Shift+]  → cycle to next website (opens panel if closed)
 *   Ctrl+Shift+[  → cycle to previous website (opens panel if closed)
 *
 * The fast website switcher (Alt+S) is handled directly in Home.jsx to avoid
 * conflicting with Ctrl+Shift+S (Quick Settings).
 *
 * `onCycle` is called with +1 / -1 so the parent can manage which site is
 * active (the dock store holds lastOpenId, the SidePanel holds activeId).
 */
export default function useSidePanelShortcuts({ open, setOpen, dock, onCycle }) {
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || !e.shiftKey) return;

      const key = e.key.toLowerCase();
      if (key === "b") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }

      const sites = dock?.visible || [];
      if (sites.length === 0) return;

      if (key === "]") {
        e.preventDefault();
        if (!open) setOpen(true);
        onCycle?.(1);
      } else if (key === "[") {
        e.preventDefault();
        if (!open) setOpen(true);
        onCycle?.(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen, dock, onCycle]);
}