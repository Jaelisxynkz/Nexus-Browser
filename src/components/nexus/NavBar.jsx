import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft, ArrowRight, RotateCw, House, Search, Copy, ClipboardPaste,
  Share2, Star, Lock, Shield, Command, EllipsisVertical, BookMarked,
  SlidersHorizontal, BookOpen, PanelRight, EyeOff,
} from "lucide-react";
import { faviconFor } from "./useBrowser";
import SiteControls from "./SiteControls";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import OmniboxSuggestions from "./OmniboxSuggestions";

const navBtn = "grid h-8 w-8 place-items-center rounded-full hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors";

export default function NavBar({
  active, nav, onToggleAssistant, onToggleSidePanel, sidePanelOpen, onToggleMenu,
  bookmarked, onBookmark, onSaveReadingList, onOpenVpn, onOpenPalette,
  onOpenQuickSettings, onOpenReader, onOpenSiteProtection, privateOn,
  incognito,
}) {
  const [value, setValue] = useState("");
  const [siteControlsOpen, setSiteControlsOpen] = useState(false);
  const [omniboxFocused, setOmniboxFocused] = useState(false);
  const { toast } = useToast();
  const incognitoOn = incognito || privateOn;

  useEffect(() => {
    setValue(active.url.startsWith("nexus://") ? "" : active.url);
  }, [active.url, active.id]);

  const submit = (e) => {
    e.preventDefault();
    // If the omnibox is showing suggestions and the user hits Enter, the
    // suggestion list captures Enter itself; this submit only fires when
    // no suggestion is hovered/selected, so a plain navigate is correct.
    nav.navigate(value);
  };

  const showSuggestions = omniboxFocused && value.trim().length > 0;

  const copyUrl = async () => {
    await navigator.clipboard.writeText(active.url).catch(() => {});
    toast({ title: "URL copied" });
  };
  const pasteGo = async () => {
    const text = await navigator.clipboard.readText().catch(() => "");
    if (text) nav.navigate(text);
  };
  const share = async () => {
    if (navigator.share) await navigator.share({ title: active.title, url: active.url }).catch(() => {});
    else copyUrl();
  };

  const displayUrl = active.url.startsWith("nexus://") ? "" : active.url;
  const isWeb = !active.url.startsWith("nexus://");

  return (
    <div className={`flex h-14 items-center gap-2 border-b px-4 transition-colors ${incognitoOn ? "border-violet-500/25 bg-violet-500/[0.04]" : "border-border/40 bg-background"}`}>
      <WorkspaceSwitcher onNavigate={nav.navigate} />

      <div className="flex items-center gap-0.5 text-muted-foreground">
        <button onClick={nav.goBack} disabled={active.hIndex <= 0} className={navBtn} aria-label="Back" title="Back (Alt+←)">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button onClick={nav.goForward} disabled={active.hIndex >= active.history.length - 1} className={navBtn} aria-label="Forward" title="Forward (Alt+→)">
          <ArrowRight className="h-4 w-4" />
        </button>
        <button onClick={nav.reload} className={navBtn} aria-label="Reload" title="Reload (Ctrl+R)">
          <RotateCw className={`h-4 w-4 ${active.loading ? "animate-spin" : ""}`} />
        </button>
        <button onClick={nav.goHome} className={navBtn} aria-label="Home" title="Home">
          <House className="h-4 w-4" />
        </button>
      </div>

      <div className="relative flex-1">
        <form
          onSubmit={submit}
          className={`flex h-10 items-center gap-3 rounded-full border px-4 transition ${
            incognitoOn
              ? "border-violet-500/40 bg-violet-500/[0.07] focus-within:border-violet-400/70 focus-within:bg-violet-500/10 focus-within:shadow-[0_0_24px_rgba(139,92,246,0.18)]"
              : "border-border/50 bg-input/50 focus-within:border-accent/60 focus-within:bg-input focus-within:shadow-[0_0_24px_hsl(var(--accent)/0.15)]"
          }`}
        >
          {incognitoOn ? (
            <span className="flex items-center gap-1 text-violet-300" title="Incognito — history, cookies, and site data aren't saved for this tab">
              <EyeOff className="h-4 w-4" />
              <span className="text-[11px] font-medium">Incognito</span>
            </span>
          ) : displayUrl.startsWith("https://") ? (
            <button type="button" onClick={() => { setSiteControlsOpen((o) => !o); onOpenSiteProtection?.(); }} className="text-emerald-400/80 hover:text-emerald-400" aria-label="Site protection" title="Site protection — privacy, permissions, cookies">
              <Lock className="h-4 w-4" />
            </button>
          ) : displayUrl.startsWith("http://") ? (
            <button type="button" onClick={() => { setSiteControlsOpen((o) => !o); onOpenSiteProtection?.(); }} className="text-amber-400/90 hover:text-amber-400" aria-label="Site protection" title="Not secure — open site protection">
              <Lock className="h-4 w-4" />
            </button>
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setOmniboxFocused(true)}
            onBlur={() => setTimeout(() => setOmniboxFocused(false), 150)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search or type a URL"
            spellCheck={false}
            aria-label="Address and search"
            autoComplete="off"
          />
          <div className="flex items-center gap-0.5 text-muted-foreground">
            <button type="button" onClick={copyUrl} className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted hover:text-foreground" aria-label="Copy URL" title="Copy URL">
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={pasteGo} className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted hover:text-foreground" aria-label="Paste and go" title="Paste and go">
              <ClipboardPaste className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={share} className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted hover:text-foreground" aria-label="Share URL" title="Share URL">
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
        {siteControlsOpen && isWeb && (
          <SiteControls url={active.url} onClose={() => setSiteControlsOpen(false)} />
        )}
        {showSuggestions && (
          <OmniboxSuggestions
            query={value}
            onNavigate={(url) => { nav.navigate(url); setOmniboxFocused(false); }}
            onDismiss={() => setOmniboxFocused(false)}
          />
        )}
      </div>

      <div className="flex items-center gap-0.5">
        <button
          onClick={onBookmark}
          disabled={!isWeb}
          className={`grid h-8 w-8 place-items-center rounded-full transition hover:bg-muted disabled:opacity-30 ${
            bookmarked ? "text-accent" : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Bookmark"
          title="Bookmark (Ctrl+D)"
        >
          <Star className={`h-4 w-4 ${bookmarked ? "fill-accent" : ""}`} />
        </button>
        {onSaveReadingList && isWeb && (
          <button onClick={onSaveReadingList} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-accent" aria-label="Save to Reading List" title="Save to Reading List">
            <BookMarked className="h-4 w-4" />
          </button>
        )}
        {onOpenReader && isWeb && (
          <button onClick={onOpenReader} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-accent" aria-label="Reader Mode" title="Reader Mode (Ctrl+Shift+R)">
            <BookOpen className="h-4 w-4" />
          </button>
        )}
        {onOpenVpn && (
          <button onClick={onOpenVpn} className={navBtn} aria-label="NexusVPN" title="NexusVPN — Disconnected">
            <Shield className="h-4 w-4" />
          </button>
        )}
        {onOpenPalette && (
          <button onClick={onOpenPalette} className={navBtn} aria-label="Command Center" title="Command Center (Ctrl+K)">
            <Command className="h-4 w-4" />
          </button>
        )}
        {onOpenQuickSettings && (
          <button onClick={onOpenQuickSettings} className={navBtn} aria-label="Quick Settings" title="Quick Settings (Ctrl+Shift+S)">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onToggleSidePanel}
          className={`grid h-8 w-8 place-items-center rounded-full transition ${
            sidePanelOpen
              ? "bg-accent/15 text-accent shadow-[0_0_12px_hsl(var(--accent)/0.25)]"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          aria-label="Web App Dock"
          title="Web App Dock"
        >
          <PanelRight className="h-4 w-4" />
        </button>
        <button
          onClick={onToggleAssistant}
          className="grid h-8 w-8 place-items-center rounded-full border border-accent/60 bg-accent/10 text-[11px] font-semibold text-accent shadow-[0_0_18px_hsl(var(--accent)/0.35)] transition hover:bg-accent hover:text-accent-foreground"
          aria-label="Toggle Assistant"
          title="Toggle Assistant"
        >
          N
        </button>
        <button onClick={onToggleMenu} className={navBtn} aria-label="Menu">
          <EllipsisVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}