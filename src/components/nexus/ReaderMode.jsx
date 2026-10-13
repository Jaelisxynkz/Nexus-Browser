import React, { useState, useEffect } from "react";
import { BookOpen, Minus, Plus, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNexusSettings } from "./useNexusSettings";
import NexusServices from "./services";

/**
 * Reader Mode — fetches a page's main content via the Nexus search/AI backend
 * and renders it in a distraction-free, typography-controlled overlay.
 *
 * Real functionality: calls the assistant backend to extract & summarize the
 * article body from the URL. Fully configurable: font size, background theme.
 */
export default function ReaderMode({ url, onClose }) {
  const { settings, update } = useNexusSettings();
  const { toast } = useToast();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fontSize = settings.readerFontSize || 16;
  const lineHeight = 1.75;
  const bgMode = settings.readerBgMode || "dark";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    NexusServices.assistant({
      messages: [
        {
          role: "user",
          content: `You are a reader-mode content extractor. Visit or reconstruct the main article content from this URL: ${url}\n\nOutput ONLY the article body text, starting with the article title on its own line, followed by the article body. Strip all navigation, ads, sidebars, footers, and boilerplate. Preserve paragraph structure with blank lines between paragraphs. If you cannot access the URL, say "READER_UNAVAILABLE" and nothing else.`,
        },
      ],
      task: "reader-mode-extract",
    })
      .then((data) => {
        if (cancelled) return;
        const reply = data?.reply || "";
        if (reply.includes("READER_UNAVAILABLE") || reply.length < 200) {
          setError("Couldn't extract readable content from this page.");
        } else {
          setContent(reply);
        }
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "Failed to load reader mode.");
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [url]);

  const adjustFont = (delta) => {
    const next = Math.min(24, Math.max(12, fontSize + delta));
    update({ readerFontSize: next });
  };

  const bgClasses = {
    dark: "bg-[#0a0c14] text-[#e2e8f0]",
    sepia: "bg-[#f4ecd8] text-[#3a3226]",
    light: "bg-[#fafafa] text-[#1a1a1a]",
  };

  // Split content into title (first line) and body
  const lines = (content || "").split("\n");
  const title = lines[0]?.replace(/^#+\s*/, "") || "Article";
  const body = lines.slice(1).join("\n").trim();
  const paragraphs = body.split(/\n\n+/).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 bg-background/90 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">Reader Mode</h3>
            <p className="max-w-[400px] truncate text-[11px] text-muted-foreground">{url}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => adjustFont(-1)} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted" title="Smaller text">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-8 text-center font-mono text-[11px] text-muted-foreground">{fontSize}px</span>
          <button onClick={() => adjustFont(1)} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted" title="Larger text">
            <Plus className="h-3.5 w-3.5" />
          </button>
          <div className="mx-1 h-5 w-px bg-border/40" />
          {["dark", "sepia", "light"].map((mode) => (
            <button
              key={mode}
              onClick={() => update({ readerBgMode: mode })}
              className={`h-5 w-5 rounded-full border transition ${
                mode === "dark" ? "border-border bg-[#0a0c14]" : mode === "sepia" ? "border-amber-300/40 bg-[#f4ecd8]" : "border-gray-300 bg-[#fafafa]"
              } ${bgMode === mode ? "ring-2 ring-accent ring-offset-1 ring-offset-background" : "opacity-50 hover:opacity-100"}`}
              title={`${mode} mode`}
            />
          ))}
          <div className="mx-1 h-5 w-px bg-border/40" />
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/20 hover:text-destructive" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto nexus-scroll ${bgClasses[bgMode] || bgClasses.dark}`}>
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              <span className="text-[13px] opacity-60">Extracting article…</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center p-8">
            <div className="max-w-md text-center">
              <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-20" />
              <h3 className="text-[15px] font-semibold">Reader Mode unavailable</h3>
              <p className="mt-2 text-[13px] opacity-70">{error}</p>
              <p className="mt-1 text-[11px] opacity-50">This usually means the site blocks content extraction.</p>
            </div>
          </div>
        ) : (
          <article className="mx-auto max-w-2xl px-8 py-12" style={{ fontSize: `${fontSize}px`, lineHeight }}>
            <h1 className="mb-8 text-[1.9em] font-bold leading-tight font-display">{title}</h1>
            {paragraphs.map((p, i) => (
              <p key={i} className="mb-5 leading-relaxed">{p}</p>
            ))}
          </article>
        )}
      </div>
    </div>
  );
}