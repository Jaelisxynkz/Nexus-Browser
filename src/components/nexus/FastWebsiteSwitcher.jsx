import React, { useEffect, useRef, useState } from "react";
import { Search, Globe } from "lucide-react";

/**
 * FastWebsiteSwitcher — a compact keyboard-driven website picker.
 * Triggered by Alt+S (conflict-free with Ctrl+Shift+S = Quick Settings).
 * Arrow keys navigate, Enter opens, Esc closes.
 */
export default function FastWebsiteSwitcher({ open, onClose, dock, onSelect }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const query = q.trim().toLowerCase();
  const sites = (dock?.visible || []).filter((w) =>
    !query || (w.name + " " + w.url).toLowerCase().includes(query)
  );

  const onKey = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, sites.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (sites[idx]) { onSelect(sites[idx].id); onClose(); }
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/40 pt-[15vh] backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[min(440px,92vw)] overflow-hidden rounded-2xl border border-border/40 bg-popover shadow-2xl nx-reveal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setIdx(0); }}
            onKeyDown={onKey}
            placeholder="Switch to a web app…"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Esc</kbd>
        </div>
        <div className="max-h-[360px] overflow-y-auto nexus-scroll p-2">
          {sites.length === 0 && (
            <div className="py-8 text-center text-[12px] text-muted-foreground">No matching web apps</div>
          )}
          {sites.map((s, i) => (
            <button
              key={s.id}
              onMouseEnter={() => setIdx(i)}
              onClick={() => { onSelect(s.id); onClose(); }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition ${
                i === idx ? "bg-accent/15 text-accent" : "text-foreground hover:bg-muted"
              }`}
            >
              <img src={s.favicon} alt="" className="h-5 w-5 rounded-sm" onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "block"; }} />
              <Globe className="hidden h-5 w-5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{s.name}</div>
                <div className="truncate text-[10px] text-muted-foreground/70">{s.url}</div>
              </div>
              {i === idx && <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">↵</kbd>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}