import React, { useEffect, useState } from "react";
import { Download, X, ChevronRight, ShieldAlert } from "lucide-react";
import { getUpdateManager, UPDATE_STATUS } from "@/components/nexus/updateManager";

/**
 * UpdateBanner — unobtrusive Nexus-styled update notification.
 *
 * Shows only when the UpdateManager has a real AVAILABLE or READY state.
 * Never fabricates "an update is ready". Dismissal is remembered for the
 * session so it doesn't nag.
 */
export default function UpdateBanner({ onNavigateUpdates }) {
  const [manager] = useState(getUpdateManager);
  const [state, setState] = useState(manager.getState());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => manager.subscribe(setState), [manager]);

  if (dismissed) return null;
  if (state.status !== UPDATE_STATUS.AVAILABLE && state.status !== UPDATE_STATUS.READY) return null;

  const isReady = state.status === UPDATE_STATUS.READY;
  const mandatory = !!state.mandatory;
  const version = state.latest?.version;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[90] w-[360px]">
      <div className="pointer-events-auto overflow-hidden rounded-2xl border border-[#3b82f6]/40 bg-[#0a0e18]/95 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-3 p-4">
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${mandatory ? "bg-red-500/15" : "bg-[#3b82f6]/20"}`}>
            {mandatory ? <ShieldAlert className="h-5 w-5 text-red-400" /> : <Download className="h-5 w-5 text-[#60a5fa]" />}
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-white">
              {mandatory ? "Important security update" : isReady ? `Nexus ${version} is ready` : "New Nexus update available"}
            </div>
            <div className="mt-0.5 text-[11.5px] text-white/55">
              {isReady ? "Restart to apply — your tabs and data are preserved." : "Download securely and update when you're ready."}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => manager.applyUpdate()}
                className="rounded-lg bg-[#3b82f6] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[#2563eb]"
              >
                {isReady ? "Restart to update" : "Update now"}
              </button>
              <button
                onClick={() => onNavigateUpdates?.()}
                className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[12px] text-white/75 transition hover:bg-white/[0.1]"
              >
                View changes <ChevronRight className="ml-0.5 inline h-3 w-3" />
              </button>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white/40 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Dismiss update banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}