import React, { useMemo, useState, useEffect } from "react";
import { Globe, ShieldCheck, RefreshCw, Check, AlertTriangle } from "lucide-react";
import { getCapabilities, bridgeOrNull } from "@/components/nexus/desktopRuntime";
import { useToast } from "@/components/ui/use-toast";
import { useNexusSettings } from "@/components/nexus/useNexusSettings";
import NexusLogo from "@/components/nexus/NexusLogo";

/**
 * DefaultBrowserView — honest registration of Nexus as the system's default.
 *
 * Only the native desktop shell can register protocol/file handlers with the
 * OS. In the web environment we never claim Nexus is the default — the UI
 * reports the true registration state, which is "not registered".
 */
export default function DefaultBrowserView() {
  const caps = useMemo(() => getCapabilities(), []);
  const [status, setStatus] = useState("checking"); // checking | registered | not-registered | unsupported
  const { toast } = useToast();
  const { update } = useNexusSettings();

  useEffect(() => {
    const b = bridgeOrNull();
    if (!caps.defaultBrowserRegistration || !b?.system?.defaultBrowserStatus) {
      setStatus(caps.defaultBrowserRegistration ? "checking" : "unsupported");
      return;
    }
    b.system.defaultBrowserStatus().then((s) => setStatus(s ? "registered" : "not-registered"));
  }, [caps]);

  const register = async () => {
    const b = bridgeOrNull();
    if (!b?.system?.setDefaultBrowser) {
      toast({ title: "Default-browser registration requires the Nexus desktop app", variant: "destructive" });
      return;
    }
    try {
      const ok = await b.system.setDefaultBrowser();
      setStatus(ok ? "registered" : "not-registered");
      update("launchAsDefaultBrowser", !!ok);
      toast(ok ? { title: "Nexus is your default browser" } : { title: "Could not register Nexus as default", variant: "destructive" });
    } catch (e) {
      toast({ title: "Registration failed", description: e.message, variant: "destructive" });
    }
  };

  const registered = status === "registered";

  return (
    <div className="min-h-full overflow-y-auto nexus-scroll bg-[#070a14] text-white">
      <div className="mx-auto max-w-2xl px-8 py-12">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#1e3a8a] shadow-[0_0_24px_rgba(59,130,246,0.35)]">
            <Globe className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Default Browser</h1>
            <p className="text-[13px] text-white/50">Make Nexus handle http, https, and file links.</p>
          </div>
        </div>

        <div className={`mt-8 rounded-2xl border p-7 ${registered ? "border-emerald-500/30 bg-emerald-500/[0.06]" : "border-white/[0.08] bg-white/[0.02]"}`}>
          <div className="flex items-center gap-4">
            <div className={`grid h-14 w-14 place-items-center rounded-2xl ${registered ? "bg-emerald-500/15" : "bg-white/[0.04]"}`}>
              {registered ? <Check className="h-7 w-7 text-emerald-400" /> : <Globe className="h-7 w-7 text-white/60" />}
            </div>
            <div className="flex-1">
              <div className="text-[16px] font-semibold">
                {status === "checking" && "Checking your system…"}
                {status === "registered" && "Nexus is your default browser"}
                {status === "not-registered" && "Nexus is not your default browser"}
                {status === "unsupported" && "Default-browser registration needs the desktop app"}
              </div>
              <div className="mt-0.5 text-[12.5px] text-white/55">
                {registered ? "Links you click will open in Nexus automatically." :
                 status === "not-registered" ? "Register Nexus for http, https, and supported file types." :
                 "Install the Nexus desktop app to register it with your operating system."}
              </div>
            </div>
          </div>

          {caps.defaultBrowserRegistration ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {!registered && (
                <button onClick={register} className="inline-flex items-center gap-2 rounded-lg bg-[#3b82f6] px-5 py-2.5 text-[13px] font-medium text-white shadow-[0_0_16px_rgba(59,130,246,0.4)] hover:bg-[#2563eb]">
                  <ShieldCheck className="h-4 w-4" /> Make Nexus default
                </button>
              )}
              {registered && (
                <button onClick={() => setStatus("not-registered")} className="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-5 py-2.5 text-[13px] text-white hover:bg-white/[0.1]">
                  <RefreshCw className="h-4 w-4" /> Re-check status
                </button>
              )}
            </div>
          ) : (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <p className="text-[12px] leading-relaxed text-white/65">
                You're using Nexus Web. The desktop app registers Nexus with the OS for <code className="rounded bg-white/[0.06] px-1">http://</code>, <code className="rounded bg-white/[0.06] px-1">https://</code>, and supported file types — the web build cannot, and we don't pretend otherwise.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="mb-3 text-[13px] font-semibold">What gets registered</div>
          <ul className="space-y-2 text-[12.5px] text-white/65">
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> <code className="rounded bg-white/[0.06] px-1">http://</code> and <code className="rounded bg-white/[0.06] px-1">https://</code> links</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> HTML file associations (where the OS supports it)</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Nexus internal routes stay distinct from web navigation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}