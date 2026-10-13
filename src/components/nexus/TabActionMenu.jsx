import React, { useEffect, useRef } from "react";
import {
  RotateCw, Copy as Dup, Pin, PinOff, Volume2, VolumeX, Star,
  BookMarked, Copy, Share2, Camera, Moon, Settings, X, XCircle,
  ArrowRight, Link2, Coffee, Layers, Eye,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { faviconFor } from "./useBrowser";

const GROUPS = [
  {
    label: "Tab",
    items: [
      { id: "reload", label: "Reload", icon: RotateCw },
      { id: "duplicate", label: "Duplicate", icon: Dup },
      { id: "pin", label: "Pin Tab", icon: Pin, dynamic: "pin" },
      { id: "mute", label: "Mute", icon: Volume2, dynamic: "mute" },
    ],
  },
  {
    label: "Save & Share",
    items: [
      { id: "bookmark", label: "Bookmark", icon: Star },
      { id: "readinglist", label: "Add to Reading List", icon: BookMarked },
      { id: "copyUrl", label: "Copy URL", icon: Copy },
      { id: "share", label: "Share", icon: Share2 },
    ],
  },
  {
    label: "Page",
    items: [
      { id: "forceDark", label: "Force Dark for Site", icon: Moon },
      { id: "screenshot", label: "Screenshot", icon: Camera, native: true },
      { id: "reader", label: "Reader Mode", icon: Eye, native: true },
    ],
  },
  {
    label: "Close",
    items: [
      { id: "close", label: "Close", icon: X },
      { id: "closeOthers", label: "Close Others", icon: XCircle },
      { id: "closeRight", label: "Close Tabs to Right", icon: ArrowRight },
    ],
  },
];

export default function TabActionMenu({ tab, x, y, onClose, onAction }) {
  const ref = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    setTimeout(() => {
      document.addEventListener("mousedown", onClick);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const handle = (item) => {
    if (item.native) {
      toast({ title: `${item.label} — Native Runtime Required`, description: "This feature needs the native Nexus shell.", variant: "destructive" });
      return;
    }
    onAction(item.id);
  };

  return (
    <div
      ref={ref}
      className="fixed z-50 w-56 overflow-hidden rounded-xl border border-border/50 bg-popover shadow-2xl"
      style={{ left: Math.min(x, window.innerWidth - 240), top: y }}
    >
      <div className="border-b border-border/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <img src={faviconFor(tab.url)} alt="" className="h-4 w-4 rounded-sm" />
          <span className="truncate text-[12px] font-medium text-foreground">{tab.title}</span>
        </div>
      </div>
      <div className="max-h-[60vh] overflow-y-auto nexus-scroll p-1">
        {GROUPS.map((g) => (
          <div key={g.label} className="mb-1">
            <div className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50">{g.label}</div>
            {g.items.map((item) => (
              <button
                key={item.id}
                onClick={() => handle(item)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12px] text-foreground transition hover:bg-accent/15"
              >
                <item.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent" />
                <span className="flex-1">{item.label}</span>
                {item.native && (
                  <span className="rounded bg-amber-500/15 px-1 py-0.5 text-[8px] font-medium text-amber-400">NATIVE</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}