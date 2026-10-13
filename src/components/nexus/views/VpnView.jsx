import React from "react";
import { useEntitlements } from "../Entitlements";
import { Shield, ShieldOff, AlertTriangle, Server } from "lucide-react";

// NexusVPN — honest integration boundary.
// A Base44 web app cannot create a real OS-level VPN tunnel. This view shows the
// entitlement-gated UI and clearly reports that the native runtime is required.
export default function VpnView({ onOpenPremium }) {
  const { has, active, plan } = useEntitlements();
  const entitled = has("VPN_PREMIUM");

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center gap-3">
        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${entitled ? "bg-[#3b82f6]/20 text-[#60a5fa]" : "bg-white/[0.06] text-white/40"}`}>
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>NexusVPN</h1>
          <p className="text-sm text-white/50">Private, encrypted browsing</p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/[0.05]">
          <ShieldOff className="h-9 w-9 text-white/40" />
        </div>
        <div className="mt-4 text-lg font-semibold text-white">Disconnected</div>

        <div className="mx-auto mt-4 max-w-md rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-left">
          <div className="flex items-start gap-2 text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="text-[12px] leading-relaxed">
              <span className="font-semibold">Native runtime required.</span> Establishing a real VPN tunnel requires
              OS-level networking, which is only available in the native Nexus application. This web build provides the
              account, entitlement, and server-selection architecture — it does not simulate a connection.
            </div>
          </div>
        </div>

        {!entitled && (
          <div className="mt-5">
            <p className="text-[13px] text-white/50">
              {active && plan === "premium" ? "Your plan includes VPN." : "NexusVPN requires Nexus Premium."}
            </p>
            {!(active && plan === "premium") && (
              <button onClick={onOpenPremium}
                className="mt-3 rounded-lg bg-[#3b82f6] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#2f6fe0]">
                View Premium
              </button>
            )}
          </div>
        )}

        <button disabled
          className="mt-6 w-full cursor-not-allowed rounded-xl bg-white/[0.06] py-3 text-[14px] font-semibold text-white/40"
          title="Requires the native Nexus runtime">
          Connect (native runtime required)
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-white/40">
          <Server className="h-4 w-4" /> Server network
        </div>
        <p className="text-[12px] text-white/45">
          Server list, latency, and load are provided by the NexusVPN backend when the native runtime is connected.
          No servers are shown here because no real tunnel infrastructure is reachable from this environment.
        </p>
      </div>
    </div>
  );
}