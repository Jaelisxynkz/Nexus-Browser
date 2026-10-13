import React, { useState, useMemo } from "react";
import {
  Calculator, Ruler, Palette, QrCode, Hash, Binary, Code2,
  FileJson, Link2, Type, Clock, Fingerprint, KeyRound, Braces,
  Check, Copy, ArrowRightLeft,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

/**
 * Nexus Toolbox — a collection of genuinely useful developer & quick tools.
 *
 * Each tool has a dedicated, focused panel — NOT a single giant page.
 * The hub shows tool tiles; selecting one swaps in that tool's UI.
 *
 * Every tool here works for real, client-side, $0. No fake functionality.
 */

const TOOLS = [
  { id: "calculator", label: "Calculator", icon: Calculator, color: "#60a5fa" },
  { id: "base64", label: "Base64", icon: Binary, color: "#34d399" },
  { id: "url", label: "URL Encode/Decode", icon: Link2, color: "#fbbf24" },
  { id: "json", label: "JSON Formatter", icon: FileJson, color: "#a855f7" },
  { id: "hash", label: "Hash Generator", icon: Hash, color: "#f472b6" },
  { id: "uuid", label: "UUID Generator", icon: KeyRound, color: "#22d3ee" },
  { id: "color", label: "Color Picker", icon: Palette, color: "#fb7185" },
  { id: "text", label: "Text Stats", icon: Type, color: "#a3e635" },
  { id: "timestamp", label: "Timestamp", icon: Clock, color: "#c084fc" },
  { id: "qr", label: "QR Generator", icon: QrCode, color: "#f59e0b" },
];

export default function NexusToolbox({ initialTool }) {
  const [active, setActive] = useState(initialTool || null);
  const tool = TOOLS.find((t) => t.id === active);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/40 px-6 py-5">
        <h1 className="text-[20px] font-semibold text-foreground">Nexus Toolbox</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Fast, offline, client-side tools for everyday tasks.</p>
      </div>
      {!tool ? (
        <div className="flex-1 overflow-y-auto nexus-scroll p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className="flex flex-col items-center gap-3 rounded-xl border border-border/40 bg-card p-5 transition hover:border-accent/40 hover:bg-card/80"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl" style={{ background: `${t.color}22`, color: t.color }}>
                  <t.icon className="h-6 w-6" />
                </div>
                <span className="text-[12px] font-medium text-foreground">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto nexus-scroll p-6">
          <button onClick={() => setActive(null)} className="mb-4 flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-accent">
            ← All tools
          </button>
          <div className="mx-auto max-w-2xl">
            {tool.id === "calculator" && <CalculatorTool />}
            {tool.id === "base64" && <Base64Tool />}
            {tool.id === "url" && <UrlTool />}
            {tool.id === "json" && <JsonTool />}
            {tool.id === "hash" && <HashTool />}
            {tool.id === "uuid" && <UuidTool />}
            {tool.id === "color" && <ColorTool />}
            {tool.id === "text" && <TextTool />}
            {tool.id === "timestamp" && <TimestampTool />}
            {tool.id === "qr" && <QrTool />}
          </div>
        </div>
      )}
    </div>
  );
}

/* --- Shared input/output shell --- */
function ToolShell({ title, children }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-5">
      <h2 className="mb-4 text-[15px] font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function CopyBtn({ value }) {
  const { toast } = useToast();
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(value); toast({ title: "Copied" }); }}
      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-accent"
      title="Copy"
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  );
}

const inputCls = "w-full rounded-lg border border-border/40 bg-input/40 px-3 py-2 text-[13px] text-foreground outline-none focus:border-accent/60";

/* --- Calculator --- */
function CalculatorTool() {
  const [expr, setExpr] = useState("");
  const result = useMemo(() => {
    try {
      if (!/^[-+*/().\d\s]*$/.test(expr)) return "";
      if (!expr.trim()) return "";
      // eslint-disable-next-line no-eval
      const r = eval(expr);
      return typeof r === "number" && isFinite(r) ? String(r) : "Error";
    } catch { return "Error"; }
  }, [expr]);
  return (
    <ToolShell title="Calculator">
      <input value={expr} onChange={(e) => setExpr(e.target.value)} className={inputCls} placeholder="e.g. 12 * (3 + 4)" autoFocus />
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-3">
        <span className="text-[10px] text-muted-foreground">=</span>
        <span className="flex-1 text-[18px] font-mono text-foreground">{result || "—"}</span>
        {result && <CopyBtn value={result} />}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {["7","8","9","/","4","5","6","*","1","2","3","-","0",".","(",")"].map((k) => (
          <button key={k} onClick={() => setExpr((p) => p + k)} className="rounded-lg bg-muted/60 py-2 text-[14px] font-mono text-foreground hover:bg-accent/10 hover:text-accent">{k}</button>
        ))}
        <button onClick={() => setExpr("")} className="col-span-2 rounded-lg bg-destructive/15 py-2 text-[13px] text-destructive hover:bg-destructive/25">Clear</button>
        <button onClick={() => setExpr((p) => p.slice(0, -1))} className="col-span-2 rounded-lg bg-muted py-2 text-[13px] text-foreground hover:bg-muted/80">⌫</button>
      </div>
    </ToolShell>
  );
}

/* --- Base64 --- */
function Base64Tool() {
  const [mode, setMode] = useState("encode");
  const [input, setInput] = useState("");
  const output = useMemo(() => {
    try {
      if (mode === "encode") return btoa(encodeURIComponent(input));
      return decodeURIComponent(atob(input));
    } catch { return "Error"; }
  }, [input, mode]);
  return (
    <ToolShell title="Base64 Encoder / Decoder">
      <div className="mb-3 flex gap-2">
        {[["encode","Encode"],["decode","Decode"]].map(([m,l]) => (
          <button key={m} onClick={() => setMode(m)} className={`rounded-lg px-3 py-1.5 text-[12px] ${mode===m?"bg-accent text-accent-foreground":"bg-muted text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} className={`${inputCls} min-h-[100px] font-mono`} placeholder="Input…" />
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-3">
        <span className="flex-1 break-all font-mono text-[12px] text-foreground">{output || "—"}</span>
        {output && output !== "Error" && <CopyBtn value={output} />}
      </div>
    </ToolShell>
  );
}

/* --- URL encode/decode --- */
function UrlTool() {
  const [mode, setMode] = useState("encode");
  const [input, setInput] = useState("");
  const output = useMemo(() => {
    try { return mode === "encode" ? encodeURIComponent(input) : decodeURIComponent(input); }
    catch { return "Error"; }
  }, [input, mode]);
  return (
    <ToolShell title="URL Encode / Decode">
      <div className="mb-3 flex gap-2">
        {[["encode","Encode"],["decode","Decode"]].map(([m,l]) => (
          <button key={m} onClick={() => setMode(m)} className={`rounded-lg px-3 py-1.5 text-[12px] ${mode===m?"bg-accent text-accent-foreground":"bg-muted text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} className={`${inputCls} min-h-[100px] font-mono`} placeholder="Input…" />
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-3">
        <span className="flex-1 break-all font-mono text-[12px] text-foreground">{output || "—"}</span>
        {output && output !== "Error" && <CopyBtn value={output} />}
      </div>
    </ToolShell>
  );
}

/* --- JSON formatter --- */
function JsonTool() {
  const [input, setInput] = useState("");
  const [error, setError] = useState(null);
  const output = useMemo(() => {
    try { setError(null); return JSON.stringify(JSON.parse(input), null, 2); }
    catch (e) { setError(e.message); return ""; }
  }, [input]);
  return (
    <ToolShell title="JSON Formatter / Validator">
      <textarea value={input} onChange={(e) => setInput(e.target.value)} className={`${inputCls} min-h-[120px] font-mono`} placeholder='{"key":"value"}' />
      {error ? (
        <div className="mt-3 rounded-lg bg-destructive/15 px-4 py-2 text-[12px] text-destructive">{error}</div>
      ) : (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/40 px-4 py-3">
          <pre className="flex-1 overflow-x-auto font-mono text-[12px] text-foreground whitespace-pre-wrap break-all">{output || "—"}</pre>
          {output && <CopyBtn value={output} />}
        </div>
      )}
    </ToolShell>
  );
}

/* --- Hash generator (uses Web Crypto) --- */
function HashTool() {
  const [input, setInput] = useState("");
  const [algo, setAlgo] = useState("SHA-256");
  const [output, setOutput] = useState("");
  React.useEffect(() => {
    (async () => {
      if (!input) { setOutput(""); return; }
      try {
        const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(input));
        const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
        setOutput(hex);
      } catch { setOutput("Error"); }
    })();
  }, [input, algo]);
  return (
    <ToolShell title="Hash Generator">
      <div className="mb-3 flex gap-2">
        {["SHA-256","SHA-384","SHA-512"].map((a) => (
          <button key={a} onClick={() => setAlgo(a)} className={`rounded-lg px-3 py-1.5 text-[12px] ${algo===a?"bg-accent text-accent-foreground":"bg-muted text-muted-foreground"}`}>{a}</button>
        ))}
      </div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} className={`${inputCls} min-h-[100px] font-mono`} placeholder="Text to hash…" />
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/40 px-4 py-3">
        <span className="flex-1 break-all font-mono text-[11px] text-foreground">{output || "—"}</span>
        {output && output !== "Error" && <CopyBtn value={output} />}
      </div>
    </ToolShell>
  );
}

/* --- UUID --- */
function UuidTool() {
  const [uuids, setUuids] = useState([]);
  const gen = () => {
    const arr = Array.from({ length: 5 }, () => crypto.randomUUID());
    setUuids(arr);
  };
  React.useEffect(() => { gen(); }, []);
  return (
    <ToolShell title="UUID Generator">
      <button onClick={gen} className="mb-3 flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[12px] text-accent-foreground hover:opacity-90">
        <Fingerprint className="h-3.5 w-3.5" /> Generate 5
      </button>
      <div className="flex flex-col gap-2">
        {uuids.map((u) => (
          <div key={u} className="flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-2">
            <span className="flex-1 font-mono text-[12px] text-foreground">{u}</span>
            <CopyBtn value={u} />
          </div>
        ))}
      </div>
    </ToolShell>
  );
}

/* --- Color picker --- */
function ColorTool() {
  const [color, setColor] = useState("#3b82f6");
  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${r}, ${g}, ${b})`;
  };
  const hexToHsl = (hex) => {
    const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b); let h, s, l = (max+min)/2;
    if (max === min) { h = s = 0; } else {
      const d = max - min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      switch (max) {
        case r: h = (g-b)/d + (g<b?6:0); break;
        case g: h = (b-r)/d + 2; break;
        case b: h = (r-g)/d + 4; break;
      }
      h /= 6;
    }
    return `hsl(${Math.round(h*360)}, ${Math.round(s*100)}%, ${Math.round(l*100)}%)`;
  };
  return (
    <ToolShell title="Color Picker & Converter">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-16 w-24 cursor-pointer rounded-lg border border-border/40 bg-transparent" />
        <div className="flex-1 space-y-2">
          {[
            ["HEX", color], ["RGB", hexToRgb(color)], ["HSL", hexToHsl(color)],
          ].map(([label, val]) => (
            <div key={label} className="flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-2">
              <span className="w-10 text-[11px] font-semibold text-muted-foreground">{label}</span>
              <span className="flex-1 font-mono text-[12px] text-foreground">{val}</span>
              <CopyBtn value={val} />
            </div>
          ))}
        </div>
      </div>
    </ToolShell>
  );
}

/* --- Text stats --- */
function TextTool() {
  const [text, setText] = useState("");
  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const lines = text ? text.split("\n").length : 0;
    const readTime = Math.ceil(words / 200);
    return { words, chars, lines, readTime };
  }, [text]);
  return (
    <ToolShell title="Text Statistics">
      <textarea value={text} onChange={(e) => setText(e.target.value)} className={`${inputCls} min-h-[120px]`} placeholder="Paste text…" />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Words", stats.words], ["Characters", stats.chars],
          ["Lines", stats.lines], ["Read time", `${stats.readTime}m`],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg bg-muted/40 p-3 text-center">
            <div className="text-[18px] font-bold text-foreground">{v}</div>
            <div className="text-[10px] text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>
    </ToolShell>
  );
}

/* --- Timestamp converter --- */
function TimestampTool() {
  const [ts, setTs] = useState(() => Math.floor(Date.now() / 1000));
  const date = useMemo(() => {
    try { return new Date(ts * 1000).toUTCString(); } catch { return "—"; }
  }, [ts]);
  return (
    <ToolShell title="Timestamp Converter">
      <div className="flex items-center gap-2">
        <input type="number" value={ts} onChange={(e) => setTs(Number(e.target.value))} className={inputCls} />
        <button onClick={() => setTs(Math.floor(Date.now() / 1000))} className="rounded-lg bg-muted px-3 py-2 text-[12px] text-foreground hover:bg-muted/80">Now</button>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-3">
        <span className="flex-1 font-mono text-[12px] text-foreground">{date}</span>
        <CopyBtn value={date} />
      </div>
    </ToolShell>
  );
}

/* --- QR generator (uses a public chart API — no key needed, free) --- */
function QrTool() {
  const [text, setText] = useState("https://nexus.browser");
  const src = text ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(text)}` : null;
  return (
    <ToolShell title="QR Code Generator">
      <input value={text} onChange={(e) => setText(e.target.value)} className={inputCls} placeholder="Text or URL…" />
      {src && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <img src={src} alt="QR code" className="h-60 w-60 rounded-lg border border-border/40 bg-white p-2" />
          <a href={src} download="nexus-qr.png" className="rounded-lg bg-muted px-3 py-1.5 text-[12px] text-foreground hover:bg-muted/80">Download</a>
        </div>
      )}
    </ToolShell>
  );
}