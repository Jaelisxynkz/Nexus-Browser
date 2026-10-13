import React, { useEffect, useRef, useState } from "react";
import { Lock, ShieldAlert } from "lucide-react";
import { useForceDark } from "./ForceDark";
import { useNexusSettings } from "./useNexusSettings";
import FindInPage from "./FindInPage";
import { isDesktopRuntime } from "./desktopRuntime";

/**
 * WebView — renders web content in a sandboxed iframe.
 *
 * - Applies force-dark class to the iframe when the per-site/global setting is on.
 * - Shows a loading shimmer, then a "blocked by site" notice if the iframe
 *   fails to load (X-Frame-Options), without pretending the site loaded.
 * - Applies the user's page zoom as an iframe scale transform.
 * - Includes Find-in-Page++ (Ctrl+F).
 */
export default function WebView({ tab }) {
  const ref = useRef(null);
  const { effectiveForUrl } = useForceDark();
  const { settings } = useNexusSettings();
  const zoom = (settings.pageZoom || 100) / 100;
  const dark = effectiveForUrl(tab.url);
  const [failed, setFailed] = useState(false);
  const loadedRef = useRef(false);
  const [findOpen, setFindOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") { e.preventDefault(); setFindOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Detect "refused to connect" — onError rarely fires for X-Frame-Options/CSP
  // blocks on cross-origin iframes. Use a load timeout: if onLoad hasn't fired
  // within 7s, the site almost certainly blocked embedding.
  useEffect(() => {
    setFailed(false);
    loadedRef.current = false;
    const timer = setTimeout(() => {
      if (!loadedRef.current) setFailed(true);
    }, 7000);
    return () => clearTimeout(timer);
  }, [tab.url]);

  if (!tab.url || tab.url.startsWith("nexus://")) return null;

  // In desktop mode, web content is rendered by a native BrowserView managed
  // by the main process — not an iframe. Render nothing here so the BrowserView
  // (positioned over this area) is visible.
  if (isDesktopRuntime()) return null;

  return (
    <div className={`relative h-full w-full overflow-hidden bg-background ${dark ? "nexus-force-dark-on" : ""}`}>
      {tab.loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" style={{ animation: "nexus-progress 1.2s ease-in-out infinite" }} />
            </div>
            <span className="text-[12px] text-muted-foreground">Loading {tab.title}…</span>
          </div>
        </div>
      )}
      <iframe
        ref={ref}
        src={tab.url}
        title={tab.title}
        className="nexus-webview border-0 bg-white"
        style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: `${100 / zoom}%`, height: `${100 / zoom}%` }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={() => { loadedRef.current = true; setFailed(false); }}
        onError={() => setFailed(true)}
      />
      {failed && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background p-8">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-400">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <h3 className="text-[15px] font-semibold text-foreground">{tab.url} refused to connect</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              This site blocks embedding inside another page (X-Frame-Options or CSP). It's a site-level
              security policy — not a Nexus limitation. The page itself is fine; open it directly.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <a
                href={tab.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-accent-foreground hover:opacity-90"
              >
                Open in new tab →
              </a>
              <button
                onClick={() => { setFailed(false); loadedRef.current = false; const f = ref.current; if (f) { f.src = tab.url; } }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/50 px-4 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
      {!dark && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-30 flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-[10px] text-muted-foreground backdrop-blur">
          {tab.url.startsWith("https://") ? <Lock className="h-3 w-3 text-emerald-400" /> : null}
          <span className="max-w-[180px] truncate">{tab.url.replace(/^https?:\/\//, "")}</span>
        </div>
      )}
      {findOpen && <FindInPage iframeRef={ref} onClose={() => setFindOpen(false)} />}
    </div>
  );
}