import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Sparkles,
  Languages,
  BookOpen,
  Link2,
  X,
  Loader2,
} from "lucide-react";
import NexusServices from "./services";
import { useToast } from "@/components/ui/use-toast";
import { useSound } from "./Sound";

/**
 * SelectionContext — a compact action bar that appears near the top of the
 * viewport when the user selects text. Offers Search, Ask AI, Translate,
 * Explain, and Copy.
 *
 * Cross-origin iframes isolate their selection, so on most external sites the
 * browser prevents us from reading the selection — this is a web platform
 * limitation, not a Nexus one. The panel works fully on internal (nexus://)
 * pages and same-origin content.
 */
export default function SelectionContext({ onAskAssistant, onNavigate }) {
  const [selection, setSelection] = useState(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [asking, setAsking] = useState(false);
  const { toast } = useToast();
  const { play } = useSound();
  const panelRef = useRef(null);

  useEffect(() => {
    const onSelectionChange = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (!text || text.length < 2) {
        setSelection(null);
        return;
      }
      try {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          setSelection(null);
          return;
        }
        setSelection(text);
        setPosition({
          top: Math.max(70, rect.top - 56),
          left: Math.min(window.innerWidth - 380, Math.max(40, rect.left)),
        });
      } catch {
        setSelection(null);
      }
    };

    const debounceTimer = setTimeout(() => {
      document.addEventListener("selectionchange", onSelectionChange);
    }, 150);

    return () => {
      clearTimeout(debounceTimer);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, []);

  const close = () => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const actions = useMemo(() => [
    {
      label: "Search",
      icon: Search,
      run: () => {
        onNavigate(selection);
        close();
        play("click");
      },
    },
    {
      label: "Ask AI",
      icon: Sparkles,
      run: () => {
        onAskAssistant?.(`I selected this text and want to know more:\n\n"${selection.slice(0, 800)}"`);
        close();
        play("toggleOn");
      },
    },
    {
      label: "Translate",
      icon: Languages,
      run: async () => {
        setAsking(true);
        try {
          const data = await NexusServices.assistant({
            messages: [{ role: "user", content: `Translate to English (if not already). Keep it concise. Text:\n\n${selection.slice(0, 1000)}` }],
          });
          toast({ title: "Translation", description: (data?.reply || "").slice(0, 240) });
        } catch {
          toast({ title: "Translation failed", variant: "destructive" });
        }
        setAsking(false);
        close();
      },
    },
    {
      label: "Explain",
      icon: BookOpen,
      run: async () => {
        setAsking(true);
        try {
          const data = await NexusServices.assistant({
            messages: [{ role: "user", content: `Explain this in simple terms, concisely:\n\n${selection.slice(0, 1000)}` }],
          });
          toast({ title: "Explanation", description: (data?.reply || "").slice(0, 240) });
        } catch {
          toast({ title: "Failed", variant: "destructive" });
        }
        setAsking(false);
        close();
      },
    },
    {
      label: "Copy",
      icon: Link2,
      run: () => {
        navigator.clipboard?.writeText(selection).catch(() => {});
        toast({ title: "Copied to clipboard" });
        close();
        play("click");
      },
    },
  ], [selection, onNavigate, onAskAssistant, toast, play]);

  if (!selection) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-50 flex items-center gap-1 rounded-xl border border-border/50 bg-popover/95 p-1.5 shadow-2xl backdrop-blur-xl"
      style={{ top: position.top, left: position.left }}
    >
      {asking ? (
        <div className="flex items-center gap-2 px-3 py-2 text-[12px] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
          Working…
        </div>
      ) : (
        <>
          {actions.map(({ label, icon: Icon, run }) => (
            <button
              key={label}
              onClick={run}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition hover:bg-accent/15 hover:text-accent"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
          <button
            onClick={close}
            className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}