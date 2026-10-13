import React, { useState } from "react";
import { EyeOff, Search, X } from "lucide-react";

/**
 * IncognitoStartPage — the new-tab page shown for incognito tabs.
 *
 * A premium, violet-themed incognito landing (like Chrome's incognito new tab)
 * with an inline search bar that navigates without recording history.
 */
export default function IncognitoStartPage({ onNavigate, onOpenAssistant }) {
  const [query, setQuery] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    onNavigate(query);
  };

  return (
    <main className="relative min-w-0 flex-1 overflow-y-auto nexus-scroll">
      {/* Violet ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-72 w-[560px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-[120px]" />
        <div className="absolute left-1/2 top-1/3 h-56 w-[400px] -translate-x-1/2 rounded-full bg-fuchsia-500/8 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex max-w-2xl flex-col items-center px-8 pb-16 pt-24">
        <div className="grid h-24 w-24 place-items-center rounded-[28px] bg-violet-500/10 ring-1 ring-violet-500/20">
          <EyeOff className="h-12 w-12 text-violet-300" />
        </div>

        <h1 className="mt-7 text-[28px] font-bold font-display text-foreground">You're incognito</h1>
        <p className="mt-3 max-w-md text-center text-[13px] leading-relaxed text-muted-foreground">
          Nexus won't save your browsing history, cookies, site data, or search terms
          for this tab. They're cleared when you close it.
        </p>

        <form
          onSubmit={submit}
          className="mt-9 flex h-12 w-full max-w-xl items-center gap-3 rounded-full border border-violet-500/30 bg-violet-500/[0.06] px-5 transition focus-within:border-violet-400/60 focus-within:bg-violet-500/10 focus-within:shadow-[0_0_28px_rgba(139,92,246,0.18)]"
        >
          <Search className="h-4 w-4 text-violet-300/70" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground/70"
            placeholder="Search privately or type a URL…"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_0_14px_rgba(139,92,246,0.45)]"
            aria-label="Go"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-10 w-full max-w-md rounded-2xl border border-border/40 bg-card/40 p-5 text-[12px] leading-relaxed text-muted-foreground/80">
          <div className="mb-2 font-medium text-foreground">What incognito does</div>
          <ul className="space-y-1.5">
            <li>• Keeps this tab's visits out of your history</li>
            <li>• Doesn't save bookmarks or reading-list items for this tab</li>
            <li>• Clears search terms and tab state on close</li>
          </ul>
          <div className="mt-3 border-t border-border/30 pt-3 text-amber-400/80">
            <b>What it doesn't do:</b> make you invisible. Your ISP, employer, and the sites you visit can still see your activity. Full cookie/cache isolation needs the native runtime.
          </div>
        </div>

        <button
          onClick={onOpenAssistant}
          className="mt-6 text-[12px] text-violet-300/80 hover:text-violet-200"
        >
          Ask Nexus AI privately →
        </button>
      </div>
    </main>
  );
}