import React from "react";
import { Cpu, Puzzle, AlertTriangle } from "lucide-react";

// Honest integration boundary for capabilities that need the native Nexus runtime.
export default function NativeBoundaryView({ kind }) {
  const content = {
    "ai-models": {
      icon: Cpu,
      title: "Local AI Models",
      desc: "Run open models on your own hardware.",
      detail: "Local inference requires a model runtime (e.g. a native process with GPU/CPU access), which is not available in a web page. The AI Provider architecture is in place: Nexus Assistant → AI Provider → Local Runtime → Model. No models are installed because none can run here.",
    },
    extensions: {
      icon: Puzzle,
      title: "Extensions",
      desc: "Extend Nexus with add-ons.",
      detail: "Hosting real browser extensions requires a native extension runtime (a Chromium-compatible shell). This web build provides the extension-management architecture and permission model; it does not simulate installed extensions.",
    },
  }[kind] || {};

  const Icon = content.icon || Puzzle;

  return (
    <div className="mx-auto max-w-xl px-6 py-14 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/[0.05] text-white/40">
        <Icon className="h-8 w-8" />
      </div>
      <h1 className="mt-5 text-2xl font-bold text-white" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>{content.title}</h1>
      <p className="mt-1 text-sm text-white/50">{content.desc}</p>
      <div className="mx-auto mt-6 max-w-md rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-left">
        <div className="flex items-start gap-2 text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-[12px] leading-relaxed">{content.detail}</p>
        </div>
      </div>
    </div>
  );
}