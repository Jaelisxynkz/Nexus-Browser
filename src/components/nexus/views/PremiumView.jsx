import React from "react";
import { useEntitlements } from "../Entitlements";
import { Crown, Check, Shield, Cloud, Sparkles, Music, Layers, Palette, Loader2 } from "lucide-react";

const FEATURES = [
  { key: "VPN_PREMIUM", icon: Shield, label: "NexusVPN Premium", desc: "Full server network, fastest protocols" },
  { key: "AI_PREMIUM", icon: Sparkles, label: "Nexus Assistant Premium", desc: "Priority AI, larger context, more tools" },
  { key: "CLOUD_SYNC", icon: Cloud, label: "Nexus Cloud Sync", desc: "Sync bookmarks, settings, workspaces" },
  { key: "PREMIUM_THEMES", icon: Palette, label: "Premium Themes", desc: "Aurora, Neon, and custom theme engine" },
  { key: "PREMIUM_AUDIO", icon: Music, label: "Premium Audio", desc: "Full ambient library and soundscapes" },
  { key: "ADVANCED_WORKSPACES", icon: Layers, label: "Advanced Workspaces", desc: "Unlimited workspaces and layouts" },
];

export default function PremiumView() {
  const { plan, status, active, expiresAt, features, loading } = useEntitlements();
  const isPremium = active && plan === "premium";

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-black">
          <Crown className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Nexus Premium</h1>
          <p className="text-sm text-white/50">Unlock the full Nexus platform</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        {loading ? (
          <div className="flex items-center gap-2 text-white/50"><Loader2 className="h-4 w-4 animate-spin" /> Checking your plan…</div>
        ) : isPremium ? (
          <div>
            <div className="flex items-center gap-2 text-amber-300">
              <Check className="h-5 w-5" /> <span className="font-semibold">Premium active</span>
            </div>
            <p className="mt-1 text-[13px] text-white/50">
              Status: {status}{expiresAt ? ` · Renews/expires ${new Date(expiresAt).toLocaleDateString()}` : ""}
            </p>
          </div>
        ) : (
          <div>
            <div className="font-semibold text-white">You're on the Free plan</div>
            <p className="mt-1 text-[13px] text-white/50">Status: {status === "none" ? "no subscription" : status}</p>
            <p className="mt-3 text-[12px] leading-relaxed text-white/40">
              Premium subscriptions and billing are managed through the Nexus account service. This web build includes
              the entitlement architecture; connecting a payment provider is configured in the app dashboard.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {FEATURES.map(({ key, icon: Icon, label, desc }) => {
          const enabled = isPremium && features.includes(key);
          return (
            <div key={key} className={`flex items-start gap-3 rounded-xl border p-4 ${
              enabled ? "border-amber-400/30 bg-amber-400/[0.05]" : "border-white/[0.07] bg-white/[0.02]"
            }`}>
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${enabled ? "text-amber-300" : "text-white/40"}`} />
              <div>
                <div className="flex items-center gap-2 text-[13px] font-medium text-white">
                  {label}
                  {enabled && <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">Active</span>}
                </div>
                <div className="mt-0.5 text-[12px] text-white/45">{desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}