import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, X, ArrowUp, Trash2, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import NexusLogo from "./NexusLogo";
import NexusServices from "./services";

const PROMPTS = [
  "Summarize this page",
  "Answer a question",
  "Explain this topic",
  "Write something",
  "Help with code",
];

const WELCOME = {
  role: "assistant",
  content:
    "Hi there! 👋 I'm **Nexus AI**, your built-in assistant. I can summarize pages, answer questions, explain topics, help you write, and assist with code.\n\nWhat can I do for you?",
};

/**
 * AssistantDrawer — the Nexus AI assistant as a dedicated right-side drawer.
 *
 * Moved OUT of the Side Panel (which is now websites-only per the dock spec).
 * The assistant lives here as its own focused surface, toggled from NavBar
 * and Sidebar. It overlays the browsing area without displacing content.
 */
export default function AssistantDrawer({ open, onClose, activeUrl, pendingPrompt, onConsumePrompt }) {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (pendingPrompt && open) {
      send(pendingPrompt);
      onConsumePrompt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt, open]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setLoading(true);
    try {
      const pageContext = activeUrl && !activeUrl.startsWith("nexus://")
        ? { url: activeUrl, title: activeUrl, domain: (() => { try { return new URL(activeUrl).hostname; } catch { return ""; } })() }
        : {};
      const data = await NexusServices.assistant({ messages: next.map((m) => ({ role: m.role, content: m.content })), pageContext });
      setMessages([...next, { role: "assistant", content: data.reply || "No response." }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Sorry — I couldn't reach the AI service right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => setMessages([WELCOME]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />
      {/* Drawer */}
      <aside className="fixed right-0 top-0 z-50 flex h-full w-[380px] flex-col border-l border-border/40 bg-sidebar shadow-2xl nx-reveal">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border/40 px-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent to-primary shadow-[0_0_14px_hsl(var(--accent)/0.4)]">
            <NexusLogo size={16} />
          </div>
          <span className="flex-1 text-[14px] font-semibold text-foreground font-display">Nexus AI</span>
          <button onClick={clear} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent/10 hover:text-accent" title="Clear chat">
            <Trash2 className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent/10 hover:text-accent" aria-label="Close assistant">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 nexus-scroll">
          {messages.length === 1 && (
            <div className="flex flex-col gap-2">
              {PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/30 px-4 py-3 text-left text-[13px] text-muted-foreground transition hover:border-accent/40 hover:bg-accent/10 hover:text-foreground"
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" />
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && (
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-primary">
                  <NexusLogo size={14} />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "rounded-tr-sm bg-accent text-accent-foreground"
                    : "rounded-tl-sm border border-border/40 bg-card text-foreground"
                }`}
              >
                {m.role === "assistant" ? (
                  <div className="prose-sm prose-invert [&_p]:my-1 [&_strong]:text-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-primary">
                <NexusLogo size={14} />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border/40 bg-card px-3.5 py-2.5 text-[13px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border/40 p-3">
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-center gap-2 rounded-full border border-border/50 bg-input px-4 py-2 transition focus-within:border-accent/50"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
              placeholder="Ask anything..."
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-accent to-primary text-white shadow-[0_0_12px_hsl(var(--accent)/0.4)] transition hover:shadow-[0_0_18px_hsl(var(--accent)/0.6)] disabled:opacity-40"
              aria-label="Send"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-2 text-center text-[10px] text-muted-foreground/60">Nexus AI can make mistakes</p>
        </div>
      </aside>
    </>
  );
}