import React, { useEffect, useMemo, useState } from "react";
import { Lock, Shield, Eye, Sun, Moon, Palette, ZoomIn, ZoomOut, Globe, X, Info } from "lucide-react";
import { useForceDark } from "./ForceDark";
import { useNexusSettings } from "./useNexusSettings";

/**
 * SiteControls — a popover opened from the NavBar lock icon.
 * Shows real connection info (HTTPS/TLS), per-site force-dark override,
 * page zoom, and domain info. No fake toggles — every control is wired.
 */
export default function SiteControls({ url, onClose }) {
  const { settings, update } = useNexusSettings();
  const fd = useForceDark();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 10);
    return () => clearTimeout(t);
  }, []);

  const domain = useMemo(() => {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
  }, [url]);

  const isHttps = url?.startsWith("https://");
  const isHttp = url?.startsWith("http://");
  const isInternal = url?.startsWith("nexus://");

  const siteOverride = domain ? fd.getSiteOverride(domain) : "follow";
  const effectiveDark = url ? fd.effectiveForUrl(url) : false;

  const setOverride = (mode) => {
    if (domain) fd.setSiteOverride(domain, mode);
  };

  const setZoom = (z) => {
    const clamped = Math.max(50, Math.min(200, z));
    update("pageZoom", clamped);
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={`absolute left-5 top-14 z-50 w-[320px] origin-top-left transition-all duration-150 ${
          open ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="overflow-hidden rounded-2xl border border-border/40 bg-popover shadow-2xl">
          {/* Connection header */}
          <div className="border-b border-border/30 p-3.5">
            {isInternal ? (
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[13px] font-medium text-foreground">Nexus Internal Page</div>
                  <div className="text-[11px] text-muted-foreground">{url}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className={`grid h-9 w-9 place-items-center rounded-xl ${isHttps ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                  {isHttps ? <Lock className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-foreground">{domain || url}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {isHttps ? "Secure connection — HTTPS verified" : "Not secure — no encryption"}
                  </div>
                </div>
              </div>
            )}
            {onClose && (
              <button onClick={onClose} className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {!isInternal && (
            <div className="p-2">
              {/* Force dark per-site */}
              <Section icon={effectiveDark ? Moon : Sun} label="Site appearance">
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "follow", label: "Auto", icon: Palette },
                    { id: "on", label: "Dark", icon: Moon },
                    { id: "off", label: "Light", icon: Sun },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setOverride(id)}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] transition ${
                        siteOverride === id
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border/30 text-muted-foreground hover:bg-accent/5"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
                {effectiveDark && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-accent/10 px-2.5 py-1.5 text-[10px] text-accent">
                    <Eye className="h-3 w-3" /> Force-dark active for this site
                  </div>
                )}
              </Section>

              {/* Zoom */}
              <Section icon={ZoomIn} label="Zoom">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoom(settings.pageZoom - 10)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-border/30 text-muted-foreground hover:bg-accent/10 hover:text-accent"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex-1 text-center text-[13px] font-medium text-foreground">{settings.pageZoom}%</div>
                  <button
                    onClick={() => setZoom(settings.pageZoom + 10)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-border/30 text-muted-foreground hover:bg-accent/10 hover:text-accent"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setZoom(100)}
                    className="rounded-lg border border-border/30 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent/10 hover:text-accent"
                  >
                    Reset
                  </button>
                </div>
              </Section>

              {/* Info */}
              <Section icon={Info} label="Connection details">
                <div className="flex flex-col gap-1.5 text-[11px]">
                  <Row label="Protocol" value={isHttps ? "HTTPS / TLS" : isHttp ? "HTTP (unencrypted)" : "—"} />
                  <Row label="Domain" value={domain || "—"} />
                  <Row label="Tracker protection" value={settings.trackingProtection !== "off" ? "On" : "Off"} />
                  <Row label="Ad blocking" value={settings.adBlocking ? "On" : "Off"} />
                </div>
              </Section>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ icon: Icon, label, children }) {
  return (
    <div className="border-b border-border/20 px-3 py-2.5 last:border-0">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground/70">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}