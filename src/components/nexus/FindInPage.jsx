import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronUp, ChevronDown, CaseSensitive, WholeWord, Regex, Highlighter } from "lucide-react";
import { useSound } from "./Sound";

/**
 * FindInPage — upgraded Ctrl+F with match count, navigation, case/whole-word/regex,
 * and highlight-all. Works on the visible page content within the WebView iframe
 * (limited by same-origin policy for external sites).
 */
export default function FindInPage({ iframeRef, onClose }) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState(0);
  const [current, setCurrent] = useState(0);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [highlightAll, setHighlightAll] = useState(true);
  const inputRef = useRef(null);
  const { play } = useSound();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const find = useCallback((dir = 0) => {
    const iframe = iframeRef?.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc || !query.trim()) { setMatches(0); setCurrent(0); return; }

      const flags = caseSensitive ? "g" : "gi";
      let pattern;
      try {
        pattern = useRegex ? new RegExp(query, flags) : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
      } catch { setMatches(0); return; }

      if (wholeWord) pattern = new RegExp(`\\b${pattern.source}\\b`, flags);

      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false);
      const textNodes = [];
      let node;
      while ((node = walker.nextNode())) textNodes.push(node);

      let count = 0;
      textNodes.forEach((textNode) => {
        if (!textNode.parentElement) return;
        const text = textNode.textContent;
        if (pattern.test(text)) count += (text.match(pattern) || []).length;
      });

      setMatches(count);
      if (count > 0) {
        const next = dir === 0 ? 1 : dir === 1 ? (current % count) + 1 : ((current - 2 + count) % count) + 1;
        setCurrent(next);
        if (highlightAll) highlightMatches(doc, pattern);
      }
    } catch {
      setMatches(-1); // cross-origin
    }
  }, [query, caseSensitive, wholeWord, useRegex, highlightAll, current, iframeRef]);

  useEffect(() => {
    const t = setTimeout(() => find(), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, caseSensitive, wholeWord, useRegex, highlightAll]);

  const highlightMatches = (doc, pattern) => {
    clearHighlights(doc);
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach((textNode) => {
      if (!textNode.parentElement) return;
      const text = textNode.textContent;
      if (!pattern.test(text)) return;
      const frag = doc.createDocumentFragment();
      let lastIdx = 0;
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIdx) frag.appendChild(doc.createTextNode(text.slice(lastIdx, match.index)));
        const mark = doc.createElement("mark");
        mark.className = "nexus-find-highlight";
        mark.style.cssText = "background:rgba(59,130,246,0.4);color:#fff;padding:0 1px;border-radius:2px;outline:1px solid rgba(59,130,246,0.6);";
        mark.textContent = match[0];
        frag.appendChild(mark);
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < text.length) frag.appendChild(doc.createTextNode(text.slice(lastIdx)));
      textNode.parentElement.replaceChild(frag, textNode);
    });
  };

  const clearHighlights = (doc) => {
    const marks = doc.querySelectorAll("mark.nexus-find-highlight");
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) { parent.replaceChild(doc.createTextNode(mark.textContent), mark); parent.normalize(); }
    });
  };

  const handleClose = () => {
    try {
      const iframe = iframeRef?.current;
      if (iframe) { const doc = iframe.contentDocument || iframe.contentWindow?.document; if (doc) clearHighlights(doc); }
    } catch {}
    onClose();
  };

  const isCrossOrigin = matches === -1;

  return (
    <div className="absolute right-4 top-4 z-50 w-80 rounded-xl border border-border/50 bg-popover shadow-2xl">
      <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
        <Highlighter className="h-4 w-4 text-accent" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") find(e.shiftKey ? -1 : 1); if (e.key === "Escape") handleClose(); }}
          placeholder="Find in page…"
          className="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        <span className="text-[11px] text-muted-foreground">
          {isCrossOrigin ? "N/A" : matches > 0 ? `${current} / ${matches}` : matches === 0 && query ? "0" : ""}
        </span>
        <button onClick={() => find(-1)} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted" disabled={matches <= 0}>
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => find(1)} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted" disabled={matches <= 0}>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button onClick={handleClose} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-1 px-3 py-2">
        {[
          { id: "case", icon: CaseSensitive, active: caseSensitive, toggle: () => setCaseSensitive(!caseSensitive), label: "Case sensitive" },
          { id: "word", icon: WholeWord, active: wholeWord, toggle: () => setWholeWord(!wholeWord), label: "Whole word" },
          { id: "regex", icon: Regex, active: useRegex, toggle: () => setUseRegex(!useRegex), label: "Regex" },
          { id: "highlight", icon: Highlighter, active: highlightAll, toggle: () => setHighlightAll(!highlightAll), label: "Highlight all" },
        ].map((opt) => (
          <button
            key={opt.id}
            onClick={opt.toggle}
            title={opt.label}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] transition ${opt.active ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-muted"}`}
          >
            <opt.icon className="h-3 w-3" />
          </button>
        ))}
      </div>
      {isCrossOrigin && (
        <div className="border-t border-border/40 px-3 py-2 text-[10px] text-amber-400/80">
          Find unavailable — page is cross-origin (external site). Use browser find (Ctrl+F) in the iframe context.
        </div>
      )}
    </div>
  );
}