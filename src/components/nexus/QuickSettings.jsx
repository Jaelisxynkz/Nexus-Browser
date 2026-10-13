import React, { useRef, useEffect } from "react";
import { Moon, Palette, Gauge, Volume2, Shield, Eye, Camera, Zap, Wifi } from "lucide-react";
import { useNexusSettings } from "./useNexusSettings";
import { useTheme } from "./Theme";
import { useSound } from "./Sound";
import { useToast } from "@/components/ui/use-toast";

export default function QuickSettings({ onClose }) {
  const ref = useRef(null);
  const { settings, update } = useNexusSettings();
  const { theme, setTheme, themes } = useTheme();
  const { play } = useSound();
  const { toast } = useToast();

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    setTimeout(() => { document.addEventListener("mousedown", onClick); document.addEventListener("keydown", onKey); }, 0);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const cycleTheme = () => {
    const keys = Object.keys(themes);
    const idx = keys.indexOf(theme);
    const next = keys[(idx + 1) % keys.length];
    setTheme(next);
    play("toggleOn");
    toast({ title: "Theme → " + (themes[next]?.label || next) });
  };

  const items = [
    {
      label: "Dark Mode",
      icon: Moon,
      value: settings.websiteDarkMode !== "off",
      toggle: () => { update("websiteDarkMode", settings.websiteDarkMode === "off" ? "on" : "off"); play("toggleOn"); toast({ title: "Force Dark " + (settings.websiteDarkMode === "off" ? "On" : "Off") }); },
    },
    {
      label: "Theme",
      icon: Palette,
      value: theme,
      action: cycleTheme,
      sub: themes[theme]?.label || theme,
    },
    {
      label: "Performance",
      icon: Gauge,
      value: settings.performanceMode,
      toggle: () => { update("performanceMode", settings.performanceMode === "performance" ? "balanced" : "performance"); play("toggleOn"); toast({ title: "Performance: " + (settings.performanceMode === "performance" ? "Balanced" : "Performance") }); },
      sub: settings.performanceMode === "performance" ? "Performance" : "Balanced",
    },
    {
      label: "UI Sounds",
      icon: Volume2,
      value: settings.uiSounds,
      toggle: () => { update("uiSounds", !settings.uiSounds); play("toggleOn"); },
    },
    {
      label: "Ad Blocking",
      icon: Shield,
      value: settings.adBlocking,
      toggle: () => { update("adBlocking", !settings.adBlocking); play("toggleOn"); toast({ title: "Ad Blocking " + (!settings.adBlocking ? "On" : "Off") }); },
    },
    {
      label: "Tab Previews",
      icon: Eye,
      value: settings.tabPreviews,
      toggle: () => { update("tabPreviews", !settings.tabPreviews); play("toggleOn"); },
    },
    {
      label: "Screenshot",
      icon: Camera,
      native: true,
      action: () => toast({ title: "Screenshot — Native Runtime Required", description: "Requires the native Nexus shell.", variant: "destructive" }),
    },
    {
      label: "VPN",
      icon: Wifi,
      native: true,
      action: () => toast({ title: "NexusVPN — Native Runtime Required", variant: "destructive" }),
    },
  ];

  return (
    <div ref={ref} className="absolute right-3 top-14 z-50 w-64 rounded-xl border border-border/50 bg-popover shadow-2xl">
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
        <span className="text-[12px] font-semibold text-foreground">Quick Settings</span>
        <span className="text-[9px] text-muted-foreground">⌘⇧S</span>
      </div>
      <div className="grid grid-cols-2 gap-1 p-2">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.toggle || item.action}
            className={`flex flex-col items-center gap-1.5 rounded-lg p-2.5 text-center transition ${
              item.native ? "opacity-50" : "hover:bg-muted/60"
            } ${typeof item.value === "boolean" && item.value ? "text-accent" : "text-muted-foreground"}`}
          >
            <item.icon className="h-4 w-4" />
            <span className="text-[10px] font-medium">{item.label}</span>
            {item.sub && <span className="text-[8px] opacity-70">{item.sub}</span>}
            {item.native && <span className="rounded bg-amber-500/15 px-1 text-[7px] text-amber-400">NATIVE</span>}
          </button>
        ))}
      </div>
    </div>
  );
}