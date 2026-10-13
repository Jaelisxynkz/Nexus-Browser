import React from "react";
import { Star, Clock, Plus, X } from "lucide-react";

export default function MenuPanel({ open, onClose, onNewTab, onShowHistory, onShowBookmarks }) {
  if (!open) return null;

  const items = [
    { label: "New Tab", icon: Plus, action: () => { onNewTab(); onClose(); } },
    { label: "Bookmarks", icon: Star, action: () => { onShowBookmarks(); onClose(); } },
    { label: "History", icon: Clock, action: () => { onShowHistory(); onClose(); } },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-5 top-[104px] z-50 w-56 rounded-2xl border border-border/50 bg-popover p-2 shadow-2xl shadow-black/60">
        <div className="mb-1 flex items-center justify-between px-2 py-1">
          <span className="text-[11px] font-medium tracking-wider text-muted-foreground">MENU</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {items.map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            onClick={action}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition hover:bg-accent/15 hover:text-foreground"
          >
            <Icon className="h-4 w-4 text-accent" />
            {label}
          </button>
        ))}
      </div>
    </>
  );
}