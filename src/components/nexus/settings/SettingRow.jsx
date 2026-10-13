import React from "react";
import { Check } from "lucide-react";

/**
 * A row control with a label, optional description, and a control on the right.
 */
export default function SettingRow({ label, desc, children, icon: Icon, accent }) {
  return (
    <div className="flex items-center gap-4 py-3.5">
      {Icon && (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-white/50">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium text-white">{label}</div>
        {desc && <div className="mt-0.5 text-[12px] leading-relaxed text-white/40">{desc}</div>}
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  );
}

/** A styled segmented control */
export function Segmented({ options, value, onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] p-1">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition ${
              active ? "text-white" : "text-white/45 hover:text-white/80"
            }`}
            style={active ? { background: "hsl(var(--accent))", boxShadow: "0 0 12px hsl(var(--accent) / 0.3)" } : undefined}
          >
            {active && <Check className="h-3 w-3" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** A styled toggle */
export function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa] disabled:opacity-40 ${
        checked ? "bg-[#3b82f6]" : "bg-white/[0.1]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

/** Section heading */
export function SectionTitle({ children }) {
  return (
    <div className="mb-1 mt-8 first:mt-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">{children}</div>
      <div className="mt-2 h-px w-full bg-white/[0.05]" />
    </div>
  );
}

/** Card container for a settings group */
export function SettingsCard({ children }) {
  return (
    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5">
      {children}
    </div>
  );
}