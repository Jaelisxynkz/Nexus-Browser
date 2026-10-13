import React, { useState } from "react";
import { FlaskConical, Check, X } from "lucide-react";
import { useNexusSettings } from "@/components/nexus/useNexusSettings";
import { useToast } from "@/components/ui/use-toast";

/**
 * Nexus Labs — experimental features.
 *
 * Each experiment is clearly labeled, independently toggled, and reversible.
 * Labs features never affect the stable browsing experience.
 */

const EXPERIMENTS = [
  {
    id: "spatialTabs",
    label: "Spatial Tab Canvas",
    description: "Arrange tabs as movable cards on a zoomable canvas.",
    setting: "labsSpatialTabs",
  },
  {
    id: "linkGlance",
    label: "Link Glance Preview",
    description: "Hover a link for an instant lightweight destination preview.",
    setting: "labsLinkGlance",
  },
  {
    id: "tabSleeping",
    label: "Tab Sleeping",
    description: "Suspend inactive tabs to free memory after 15 minutes.",
    setting: "labsTabSleeping",
  },
  {
    id: "syncScroll",
    label: "Synchronized Scrolling",
    description: "Scroll multiple split panes in sync when enabled per layout.",
    setting: "labsSyncScroll",
  },
  {
    id: "linkHints",
    label: "Keyboard Link Hints",
    description: "Press F to reveal numbered hints on every clickable link.",
    setting: "labsLinkHints",
  },
  {
    id: "rockerGestures",
    label: "Rocker Mouse Gestures",
    description: "Hold right-click + click left to go back; reverse for forward.",
    setting: "labsRockerGestures",
  },
];

export default function LabsView() {
  const { settings, update } = useNexusSettings();
  const { toast } = useToast();

  const toggle = (exp) => {
    const next = !settings[exp.setting];
    update(exp.setting, next);
    toast({ title: next ? `${exp.label} enabled` : `${exp.label} disabled` });
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center gap-3 border-b border-border/40 pb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/15 text-violet-400">
          <FlaskConical className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-[20px] font-semibold text-foreground">Nexus Labs</h1>
          <p className="text-[13px] text-muted-foreground">Experimental features. Independently toggled, reversible, isolated.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {EXPERIMENTS.map((exp) => {
          const on = !!settings[exp.setting];
          return (
            <button
              key={exp.id}
              onClick={() => toggle(exp)}
              className="flex items-center gap-4 rounded-xl border border-border/40 bg-card p-4 text-left transition hover:border-accent/40"
            >
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${on ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                {on ? <Check className="h-5 w-5" /> : <X className="h-5 w-5 opacity-40" />}
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-medium text-foreground">{exp.label}</div>
                <div className="text-[12px] text-muted-foreground">{exp.description}</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${on ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"}`}>
                {on ? "ON" : "OFF"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-[12px] leading-relaxed text-amber-200/80">
        Labs features may change or be removed. They are opt-in and do not affect stable browsing.
        If an experiment causes issues, disable it here — changes apply instantly.
      </div>
    </div>
  );
}