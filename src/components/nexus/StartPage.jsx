import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Search,
  Mic,
  Sparkles,
  Languages,
  BookOpen,
  PenLine,
  Code2,
  MoreHorizontal,
  Plus,
  Clock,
  X,
} from "lucide-react";
import NexusLogo from "./NexusLogo";
import { faviconFor } from "./useBrowser";
import { getSetting, setSetting } from "./services";

const QUICK_ACTIONS = [
  { label: "Summarize Page", icon: Sparkles, prompt: "Summarize the current page for me" },
  { label: "Translate", icon: Languages, prompt: "Translate text for me" },
  { label: "Explain", icon: BookOpen, prompt: "Explain this topic" },
  { label: "Write", icon: PenLine, prompt: "Help me write something" },
  { label: "Code", icon: Code2, prompt: "Help me with code" },
  { label: "More", icon: MoreHorizontal, prompt: "" },
];

const SHORTCUTS = [
  { name: "YouTube", url: "https://youtube.com", color: "#ff0000" },
  { name: "Twitter", url: "https://x.com", color: "#1da1f2" },
  { name: "GitHub", url: "https://github.com", color: "#e6eaf5" },
  { name: "Reddit", url: "https://reddit.com", color: "#ff4500" },
  { name: "Wikipedia", url: "https://wikipedia.org", color: "#ffffff" },
];

export default function StartPage({ onOpenAssistant, onNavigate, onAskAssistant }) {
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState([]);
  const [customShortcuts, setCustomShortcuts] = useState([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [listening, setListening] = useState(false);
  const voiceSupported = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    base44.entities.HistoryEntry.list("-created_date", 5).then(setHistory).catch(() => {});
    getSetting("start_shortcuts", []).then((s) => { if (Array.isArray(s)) setCustomShortcuts(s); }).catch(() => {});
  }, []);

  const persistShortcuts = (next) => {
    setCustomShortcuts(next);
    setSetting("start_shortcuts", next).catch(() => {});
  };

  const removeShortcut = (name) => persistShortcuts(customShortcuts.filter((s) => s.name !== name));

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || listening) return;
    const rec = new SR();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (ev) => {
      const text = ev.results[0]?.[0]?.transcript || "";
      if (text) { setQuery(text); onNavigate(text); }
    };
    rec.start();
  };

  const submit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    onNavigate(query);
  };

  const addShortcut = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) return;
    const url = newUrl.startsWith("http") ? newUrl : "https://" + newUrl;
    persistShortcuts([...customShortcuts.filter((s) => s.name !== newName.trim()), { name: newName.trim(), url, color: "#60a5fa" }]);
    setNewName("");
    setNewUrl("");
    setAdding(false);
  };

  return (
    <main className="relative min-w-0 flex-1 overflow-y-auto nexus-scroll">
      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-8 pb-16 pt-16">
        {/* Layered aurora backdrops */}
        <div className="nexus-aurora nexus-aurora-a left-1/2 top-6 h-72 w-[640px] -translate-x-1/2 bg-blue-500/25" />
        <div className="nexus-aurora nexus-aurora-b left-1/2 top-2 h-72 w-[520px] -translate-x-1/2 bg-violet-500/25" />
        <div className="nexus-aurora nexus-aurora-a left-1/2 top-10 h-64 w-[440px] -translate-x-1/2 bg-cyan-400/15" />
        <div className="nexus-hero-grain pointer-events-none absolute left-0 right-0 top-0 h-[360px] opacity-70" />

        <h1 className="relative text-[104px] font-bold leading-none font-display">
          <span className="nexus-title" style={{ letterSpacing: "0.02em" }}>
            NEXUS
          </span>
          <span className="nexus-title-sheen" aria-hidden="true" />
        </h1>
        <p className="mt-6 text-[12px] font-medium tracking-[0.38em] text-muted-foreground">
          AI-POWERED BROWSING. LIMITLESS POSSIBILITIES.
        </p>

        <div className="mt-10 w-full max-w-2xl">
          <form
            onSubmit={submit}
            className="flex h-14 items-center gap-3 rounded-full border border-border/50 bg-card/80 px-5 shadow-[0_0_40px_hsl(var(--accent)/0.08)] transition focus-within:border-accent/50 focus-within:shadow-[0_0_60px_hsl(var(--accent)/0.18)]"
          >
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
              placeholder="Ask me anything or search the web..."
            />
            {voiceSupported && (
              <button
                type="button"
                onClick={startVoice}
                title={listening ? "Listening…" : "Voice search"}
                className={`grid h-9 w-9 place-items-center rounded-full transition ${listening ? "animate-pulse bg-destructive/20 text-destructive" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                aria-label="Voice search"
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-accent to-primary text-white shadow-[0_0_14px_hsl(var(--accent)/0.5)]"
              aria-label="Go"
            >
              <NexusLogo size={18} />
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {QUICK_ACTIONS.map(({ label, icon: Icon, prompt }) => (
              <button
                key={label}
                onClick={() => (prompt ? onAskAssistant(prompt) : onOpenAssistant())}
                className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/50 px-3.5 py-1.5 text-[12px] text-muted-foreground transition hover:border-accent/40 hover:bg-accent/10 hover:text-foreground"
              >
                <Icon className="h-3.5 w-3.5 text-accent" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 grid w-full grid-cols-3 gap-4 sm:grid-cols-6">
          {[...SHORTCUTS.map((s) => ({ ...s, builtIn: true })), ...customShortcuts].map(({ name, url, builtIn }) => (
            <div key={name} className="group relative flex flex-col items-center">
              <button onClick={() => onNavigate(url)} className="flex flex-col items-center gap-2.5">
                <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-border/40 bg-muted/50 shadow-lg transition group-hover:scale-105 group-hover:border-border">
                  <img src={faviconFor(url)} alt="" className="h-7 w-7" />
                </div>
                <span className="max-w-[80px] truncate text-[11px] text-muted-foreground group-hover:text-foreground">{name}</span>
              </button>
              {!builtIn && (
                <button
                  onClick={() => removeShortcut(name)}
                  aria-label={`Remove ${name}`}
                  className="absolute -right-1 -top-1 hidden h-5 w-5 place-items-center rounded-full border border-border/50 bg-card text-muted-foreground hover:text-destructive group-hover:grid"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setAdding((a) => !a)} className="group flex flex-col items-center gap-2.5">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-dashed border-border/60 bg-muted/30 text-muted-foreground transition group-hover:border-accent/50 group-hover:text-accent">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-[11px] text-muted-foreground group-hover:text-foreground">Add Shortcut</span>
          </button>
        </div>

        {adding && (
          <form onSubmit={addShortcut} className="mt-4 flex w-full max-w-md items-center gap-2 rounded-xl border border-border/50 bg-card p-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name"
              className="w-24 rounded-md bg-muted px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/50"
            />
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 rounded-md bg-muted px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/50"
            />
            <button type="submit" className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90">
              Add
            </button>
          </form>
        )}

        <div className="mt-12 grid w-full gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/40 bg-card/60 p-5">
            <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-foreground">
              <Clock className="h-4 w-4 text-accent" />
              Recent Activity
            </div>
            {history.length === 0 ? (
              <p className="text-[13px] text-muted-foreground/60">No history yet. Browse a site to get started.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => onNavigate(h.url)}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {h.favicon && <img src={h.favicon} alt="" className="h-3.5 w-3.5 rounded-sm" />}
                    <span className="truncate">{h.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-card to-background p-5">
            <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-accent/20 blur-2xl" />
            <div className="relative flex items-start gap-4">
              <div className="nexus-pulse-ring relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-primary shadow-[0_0_20px_hsl(var(--accent)/0.5)]">
                <NexusLogo size={22} />
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-semibold text-foreground">Nexus AI Assistant</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  Hello! I'm Nexus AI. I can help you with browsing, research, writing, coding, and much more.
                </p>
                <button
                  onClick={onOpenAssistant}
                  className="mt-3 rounded-full bg-gradient-to-r from-accent to-primary px-4 py-1.5 text-[12px] font-medium text-white shadow-[0_0_18px_hsl(var(--accent)/0.4)] transition hover:shadow-[0_0_24px_hsl(var(--accent)/0.6)]"
                >
                  Start a Conversation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}