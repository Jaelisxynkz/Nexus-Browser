import React, { useEffect, useState } from "react";
import { X, ArrowRight, Star, Volume2 } from "lucide-react";
import NexusLogo from "./NexusLogo";
import { faviconFor } from "./useBrowser";

/**
 * TabHoverPreview — premium tab preview card shown after hovering a tab.
 * Shows favicon, title, domain, URL, and status indicators.
 * Thumbnail capture requires native runtime (not faked here).
 */
export default function TabHoverPreview({ tab, onClose, onSwitch }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  const fav = faviconFor(tab.url);
  let domain = "Nexus Internal Page";
  try { if (!tab.url.startsWith("nexus://")) domain = new URL(tab.url).hostname.replace(/^www\./, ""); } catch {}

  return (
    <div
      className={`fixed left-1/2 top-14 z-50 -translate-x-1/2 transition-all duration-200 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
      onMouseEnter={onClose}
    >
      <div className="w-72 overflow-hidden rounded-xl border border-border/50 bg-popover shadow-2xl">
        {/* Thumbnail placeholder — native runtime required for real capture */}
        <div className="relative h-32 bg-gradient-to-br from-muted to-card">
          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground/40">
            Preview capture — Native Runtime Required
          </div>
          <div className="absolute left-2 top-2 flex gap-1">
            {tab.pinned && <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[9px] text-accent">PINNED</span>}
          </div>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2">
            {tab.loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            ) : fav ? (
              <img src={fav} alt="" className="h-4 w-4 rounded-sm" />
            ) : (
              <NexusLogo size={16} />
            )}
            <span className="flex-1 truncate text-[13px] font-medium text-foreground">{tab.title}</span>
          </div>
          <div className="mt-1.5 truncate text-[11px] text-muted-foreground">{domain}</div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <button
              onClick={onSwitch}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent/15 px-3 py-1.5 text-[11px] font-medium text-accent transition hover:bg-accent/25"
            >
              <ArrowRight className="h-3 w-3" /> Switch
            </button>
            <button
              onClick={onClose}
              className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}