import React, { useState, useRef, useEffect } from "react";
import {
  ExternalLink, SquareArrowOutUpRight, Layers, PanelRight, EyeOff, Star,
  FileSearch, Copy, Type, ShieldCheck, Share2, MoreHorizontal, FlaskConical,
  Search as SearchIcon, BookmarkCheck, X,
} from "lucide-react";

/**
 * ResultActionMenu — per-result action menu.
 * Groups: Open, Investigate, Organize.
 * Keyboard accessible (Esc closes, arrow nav).
 */
export default function ResultActionMenu({ result, query, onAction, onClose }) {
  const [index, setIndex] = useState(0);
  const ref = useRef(null);

  const groups = [
    {
      label: "Open",
      items: [
        { id: "open", label: "Open", icon: ExternalLink },
        { id: "newTab", label: "Open in New Tab", icon: SquareArrowOutUpRight },
        { id: "backgroundTab", label: "Open in Background Tab", icon: Layers },
        { id: "split", label: "Open in Split View", icon: Layers },
        { id: "sidePanel", label: "Open in Side Panel", icon: PanelRight },
        { id: "private", label: "Open in Private Window", icon: EyeOff },
      ],
    },
    {
      label: "Investigate",
      items: [
        { id: "preview", label: "Preview", icon: FileSearch },
        { id: "checkSafety", label: "Check Safety", icon: ShieldCheck },
        { id: "searchWithin", label: "Search Within This Site", icon: SearchIcon },
      ],
    },
    {
      label: "Organize",
      items: [
        { id: "bookmark", label: "Save Bookmark", icon: Star },
        { id: "research", label: "Add to Research", icon: FlaskConical },
        { id: "copyLink", label: "Copy Link", icon: Copy },
        { id: "copyTitle", label: "Copy Title", icon: Type },
        { id: "share", label: "Share", icon: Share2 },
      ],
    },
  ];

  const flat = groups.flatMap((g) => g.items);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(i + 1, flat.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
      else if (e.key === "Enter") { e.preventDefault(); const item = flat[index]; if (item) onAction(item.id, result); onClose(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [flat, index, onAction, onClose, result]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  let runningIndex = -1;

  return (
    <div
      ref={ref}
      className="nx-reveal absolute right-0 top-full z-40 mt-1 w-60 overflow-hidden rounded-xl border border-border/50 bg-popover shadow-2xl"
      role="menu"
    >
      {groups.map((group) => (
        <div key={group.label}>
          <div className="border-b border-border/20 bg-muted/20 px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            {group.label}
          </div>
          {group.items.map((item) => {
            runningIndex++;
            const active = runningIndex === index;
            return (
              <button
                key={item.id}
                onMouseEnter={() => setIndex(runningIndex)}
                onClick={() => { onAction(item.id, result); onClose(); }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] transition-colors ${active ? "bg-accent/15 text-accent" : "text-foreground hover:bg-muted/40"}`}
                role="menuitem"
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * ResultPreview — fast inline preview panel.
 * Shows: favicon, title, URL, domain, security badge, open actions.
 * Does NOT fetch the page (would consume credits / break sandbox).
 */
export function ResultPreview({ result, assessment, onNavigate, onAction, onClose }) {
  const domain = result.domain || (() => { try { return new URL(result.url).hostname; } catch { return ""; } })();

  return (
    <div className="nx-reveal absolute inset-0 z-30 flex flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-foreground">Preview</span>
        </div>
        <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted" aria-label="Close preview">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto nexus-scroll p-4">
        <div className="flex items-start gap-3">
          <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} alt="" className="mt-0.5 h-8 w-8 rounded-md" onError={(e) => (e.currentTarget.style.display = "none")} />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-foreground">{result.title}</div>
            <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{result.url}</div>
          </div>
        </div>
        {result.description && (
          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground/90">{result.description}</p>
        )}
        <div className="mt-4 space-y-2 text-[11px] text-muted-foreground/70">
          <div className="flex justify-between"><span>Domain</span><span className="font-mono text-foreground/80">{domain}</span></div>
          <div className="flex justify-between"><span>Protocol</span><span className="font-mono text-foreground/80">{result.url.startsWith("https") ? "HTTPS" : "HTTP"}</span></div>
          {assessment && (
            <div className="flex justify-between"><span>Risk</span><span className="text-foreground/80">{assessment.risk}/100 ({assessment.level})</span></div>
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => onNavigate(result.url)} className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-medium text-accent-foreground hover:opacity-90">
            <ExternalLink className="h-3.5 w-3.5" /> Open
          </button>
          <button onClick={() => onAction("private", result)} className="flex items-center gap-1.5 rounded-lg border border-border/40 px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground">
            <EyeOff className="h-3.5 w-3.5" /> Private
          </button>
          <button onClick={() => onAction("checkSafety", result)} className="flex items-center gap-1.5 rounded-lg border border-border/40 px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Check Safety
          </button>
        </div>
        <div className="mt-4 rounded-lg border border-border/30 bg-muted/20 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground/60">
          Deep page scan requires the Nexus native browser runtime. This preview shows metadata only — it does not load the page or inspect its content.
        </div>
      </div>
    </div>
  );
}