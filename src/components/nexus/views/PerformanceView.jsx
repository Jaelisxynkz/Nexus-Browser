import React from "react";
import { Gauge, Cpu, MemoryStick, Globe } from "lucide-react";

// Performance Center — shows only real, measurable runtime values.
// GPU/VRAM and per-tab process stats require a native runtime and are labeled as such.
export default function PerformanceView({ tabCount }) {
  const cores = navigator.hardwareConcurrency || null;
  const memory = navigator.deviceMemory || null;
  const perf = performance.memory || null; // Chromium only
  const usedJS = perf ? (perf.usedJSHeapSize / 1048576).toFixed(1) : null;
  const totalJS = perf ? (perf.jsHeapSizeLimit / 1048576).toFixed(0) : null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center gap-3">
        <Gauge className="h-7 w-7 text-[#60a5fa]" />
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Performance</h1>
      </div>
      <p className="mt-1 text-sm text-white/50">Real runtime metrics for this Nexus session.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-[12px] text-white/45"><Cpu className="h-4 w-4" /> CPU</div>
          <div className="mt-2 text-xl font-semibold text-white">{cores ? `${cores} logical cores` : "Unknown"}</div>
          <div className="text-[11px] text-white/35">Reported by this device</div>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-[12px] text-white/45"><MemoryStick className="h-4 w-4" /> Memory</div>
          <div className="mt-2 text-xl font-semibold text-white">{memory ? `~${memory} GB` : "Unknown"}</div>
          <div className="text-[11px] text-white/35">{usedJS ? `JS heap ${usedJS} MB / ${totalJS} MB` : "Approximate device memory"}</div>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-[12px] text-white/45"><Globe className="h-4 w-4" /> Open tabs</div>
          <div className="mt-2 text-xl font-semibold text-white">{tabCount}</div>
          <div className="text-[11px] text-white/35">In this session</div>
        </div>
        <div className="rounded-xl border border-dashed border-white/[0.1] bg-transparent p-4">
          <div className="text-[12px] text-white/45">GPU / VRAM</div>
          <div className="mt-2 text-[13px] font-medium text-white/60">Native runtime required</div>
          <div className="text-[11px] text-white/35">Hardware GPU stats aren't exposed to a web page.</div>
        </div>
      </div>
    </div>
  );
}