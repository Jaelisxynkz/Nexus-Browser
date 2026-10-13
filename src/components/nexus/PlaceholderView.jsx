import React from "react";
import { ArrowLeft } from "lucide-react";

export default function PlaceholderView({ title, description, icon: Icon, onBack }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#3b82f6]/20 to-[#1e3a8a]/30 text-[#60a5fa] shadow-[0_0_24px_rgba(59,130,246,0.25)]">
        {Icon && <Icon className="h-8 w-8" />}
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-white/55">{description}</p>
      </div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 rounded-lg bg-white/[0.05] px-4 py-2 text-[13px] text-white/80 transition hover:bg-white/[0.1] hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </button>
    </div>
  );
}