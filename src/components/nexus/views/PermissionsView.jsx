import React, { useEffect, useMemo, useState } from "react";
import {
  Camera, Mic, MapPin, Bell, Bluetooth, Usb, Clipboard, Volume2, Eye, Trash2, Clock,
} from "lucide-react";
import { loadPermissionHistory, revokePermissionDecision } from "../privacyEngine";
import { useToast } from "@/components/ui/use-toast";

const PERMISSIONS = [
  { key: "camera", icon: Camera, label: "Camera", grantable: typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia },
  { key: "microphone", icon: Mic, label: "Microphone", grantable: typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia },
  { key: "geolocation", icon: MapPin, label: "Location", grantable: typeof navigator !== "undefined" && !!navigator.geolocation },
  { key: "notifications", icon: Bell, label: "Notifications", grantable: typeof window !== "undefined" && "Notification" in window },
  { key: "clipboard-read", icon: Clipboard, label: "Clipboard read", grantable: typeof navigator !== "undefined" && !!navigator.clipboard?.readText },
  { key: "bluetooth", icon: Bluetooth, label: "Bluetooth", grantable: typeof navigator !== "undefined" && !!navigator.bluetooth },
  { key: "usb", icon: Usb, label: "USB", grantable: typeof navigator !== "undefined" && !!navigator.usb },
  { key: "midi", icon: Volume2, label: "MIDI", grantable: typeof navigator !== "undefined" && !!navigator.requestMIDIAccess },
];

export default function PermissionsView() {
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();

  const refresh = () => setHistory(loadPermissionHistory());
  useEffect(() => { refresh(); }, []);

  const requestPermission = async (key) => {
    try {
      let decision = "blocked";
      if (key === "notifications" && window.Notification) {
        const p = await Notification.requestPermission();
        decision = p === "granted" ? "granted" : "blocked";
      } else if (key === "geolocation") {
        // Prompt without using the result — we only log the decision.
        await new Promise((res) => navigator.geolocation.getCurrentPosition(() => res(), () => res(), { timeout: 4000, maximumAge: Infinity }));
        decision = "granted";
      } else if (key === "camera" || key === "microphone") {
        const stream = await navigator.mediaDevices.getUserMedia({ [key === "camera" ? "video" : "audio"]: true });
        stream.getTracks().forEach((t) => t.stop());
        decision = "granted";
      } else {
        decision = "unsupported";
      }
      loadPermissionHistory(); // ensure exists
      const log = loadPermissionHistory();
      log.unshift({ host: location.hostname, permission: key, decision, at: Date.now() });
      localStorage.setItem("nexus.permission.history.v1", JSON.stringify(log.slice(0, 100)));
      refresh();
      toast({ title: decision === "granted" ? "Permission granted" : decision === "blocked" ? "Permission blocked" : "Not supported here" });
    } catch {
      const log = loadPermissionHistory();
      log.unshift({ host: location.hostname, permission: key, decision: "blocked", at: Date.now() });
      localStorage.setItem("nexus.permission.history.v1", JSON.stringify(log.slice(0, 100)));
      refresh();
      toast({ title: "Permission blocked" });
    }
  };

  const filtered = useMemo(() => {
    if (filter === "all") return history;
    if (filter === "allowed") return history.filter((h) => h.decision === "granted");
    if (filter === "blocked") return history.filter((h) => h.decision === "blocked");
    return history;
  }, [history, filter]);

  const revoke = (i) => { revokePermissionDecision(i); refresh(); toast({ title: "Decision revoked" }); };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center gap-3 border-b border-border/40 pb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent"><Eye className="h-5 w-5" /></div>
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Permission Center</h1>
          <p className="text-[12px] text-muted-foreground">Request, grant, and revoke site permissions.</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PERMISSIONS.map((p) => (
          <button
            key={p.key}
            onClick={() => requestPermission(p.key)}
            disabled={!p.grantable}
            className={`rounded-xl border p-3 text-left transition ${p.grantable ? "border-border/40 bg-card/40 hover:border-accent/40" : "border-border/20 bg-muted/20 opacity-50"}`}
          >
            <p.icon className="h-4 w-4 text-accent" />
            <div className="mt-2 text-[12px] font-medium text-foreground">{p.label}</div>
            <div className="text-[9px] text-muted-foreground/60">{p.grantable ? "Tap to request" : "Not available"}</div>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60"><Clock className="h-3.5 w-3.5" /> Permission History</div>
          <div className="inline-flex rounded-lg border border-border/40 bg-muted/40 p-0.5 text-[10px]">
            {["all", "allowed", "blocked"].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded px-2 py-0.5 ${filter === f ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>{f[0].toUpperCase() + f.slice(1)}</button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border/30 bg-card/30 p-6 text-center text-[12px] text-muted-foreground/60">No permission activity yet.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/40">
            {filtered.map((h, i) => (
              <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${i % 2 === 0 ? "bg-card/30" : "bg-card/10"}`}>
                <div className="min-w-0">
                  <div className="text-[12px] text-foreground">{h.host} · <span className="text-muted-foreground">{h.permission}</span></div>
                  <div className="text-[10px] text-muted-foreground/60">{new Date(h.at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${h.decision === "granted" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                    {h.decision === "granted" ? "Allowed" : "Blocked"}
                  </span>
                  {!h.revoked && <button onClick={() => revoke(i)} title="Revoke" className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-destructive/20 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}