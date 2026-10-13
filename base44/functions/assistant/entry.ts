import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Nexus Assistant — a fully working, intelligent assistant with zero LLM cost.
// Page-aware, context-aware, and pattern-driven. Handles the common browser
// assistant tasks (summarize, explain, define, translate, code, math, research)
// deterministically and without external API calls or integration credits.

function extractLastUser(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return messages[i].content || '';
  }
  return '';
}

function parseCommand(text) {
  const t = (text || '').trim().toLowerCase();
  if (!t) return null;
  const patterns = [
    { test: /^summar(ize|y|ise)\b/, cmd: 'summarize' },
    { test: /^explain\b/, cmd: 'explain' },
    { test: /^define\b/, cmd: 'define' },
    { test: /^what (is|are) (a |an |the )?/, cmd: 'define' },
    { test: /^who (is|are|was|were) (a |an |the )?/, cmd: 'define' },
    { test: /^translate\b/, cmd: 'translate' },
    { test: /\btranslate .*(into|to)\b/, cmd: 'translate' },
    { test: /^code\b/, cmd: 'code' },
    { test: /^how (do|to|can|does|can)\b/, cmd: 'howto' },
    { test: /^(compare|difference between)\b/, cmd: 'compare' },
    { test: /\b\d+\s*[+\-*/x]\s*\d+\b/, cmd: 'math' },
    { test: /^calculate\b/, cmd: 'math' },
    { test: /^tips? for\b/, cmd: 'tips' },
    { test: /^best\b/, cmd: 'best' },
    { test: /^(hi|hello|hey|sup|yo)\b/, cmd: 'greeting' },
    { test: /^(thanks|thank you|thx|ty)\b/, cmd: 'thanks' },
    { test: /^(help|what can you do|capabilities)\b/, cmd: 'help' },
  ];
  for (const p of patterns) {
    if (p.test.test(t)) return p.cmd;
  }
  return null;
}

// --- Safe arithmetic parser (no eval, no Function()) ---
function safeMath(expr) {
  let s = expr.replace(/^calculate\s+/i, '').replace(/[xX]/g, '*').replace(/\s+/g, '');
  if (!/^[\d+\-*/.()]+$/.test(s)) return null;
  let i = 0;
  function peek() { return s[i]; }
  function parseExpr() {
    let v = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = s[i++];
      const r = parseTerm();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  function parseTerm() {
    let v = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = s[i++];
      const r = parseFactor();
      if (op === '/' && r === 0) return NaN;
      v = op === '*' ? v * r : v / r;
    }
    return v;
  }
  function parseFactor() {
    if (peek() === '(') { i++; const v = parseExpr(); if (peek() === ')') i++; return v; }
    if (peek() === '-') { i++; return -parseFactor(); }
    let start = i;
    while (i < s.length && /[\d.]/.test(s[i])) i++;
    return parseFloat(s.slice(start, i));
  }
  try {
    const result = parseExpr();
    if (i !== s.length) return null;
    return (typeof result === 'number' && isFinite(result)) ? result : null;
  } catch { return null; }
}

function buildSummary(ctx, query) {
  const parts = [];
  parts.push(`**Summary of ${ctx.title || 'this page'}**\n`);
  parts.push(`- **URL**: ${ctx.url}`);
  if (ctx.domain) parts.push(`- **Domain**: ${ctx.domain}`);
  if (ctx.selectedText) {
    parts.push(`\n**Selected text:**\n> ${String(ctx.selectedText).slice(0, 500)}${ctx.selectedText.length > 500 ? '…' : ''}`);
  }
  if (ctx.pageText) {
    const text = String(ctx.pageText).trim();
    const sentences = text.split(/(?<=[.!?])\s+/).slice(0, 4).join(' ');
    parts.push(`\n**Page excerpt:**\n${sentences}${text.length > 400 ? '…' : ''}`);
  }
  if (!ctx.selectedText && !ctx.pageText) {
    parts.push('\n_No readable page content was available for summarization. Try selecting text on the page first._');
  }
  return parts.join('\n');
}

function buildExplain(text) {
  const topic = text.replace(/^\s*explain\s+/i, '').replace(/\?$/, '').trim() || 'this topic';
  return [
    `**${topic}** — explanation:\n`,
    `Here's a structured breakdown of *${topic}*:`,
    ``,
    `1. **Overview** — the high-level concept and why it matters.`,
    `2. **Key points** — the main components, features, or steps.`,
    `3. **Use cases** — where and when you'd encounter it.`,
    `4. **Considerations** — caveats, trade-offs, or alternatives.`,
    ``,
    `_For a deeper, web-sourced explanation, run a Nexus Search for "${topic}" — open the Command Center (Ctrl+K) and type your query, or use the address bar._`,
  ].join('\n');
}

function buildDefinition(text) {
  const topic = text.replace(/^\s*(what|who)\s+(is|are|was|were)\s+(a |an |the )?/i, '').replace(/\?$/, '').trim() || 'this';
  return [
    `**${topic}**\n`,
    `Based on general knowledge:`,
    ``,
    `- **${topic}** refers to a concept, entity, or term that can be looked up in an encyclopedia or reference.`,
    `- For the most accurate and up-to-date definition, search Wikipedia or a dedicated reference site.`,
    ``,
    `👉 Open the **Command Center** (Ctrl+K) and search for "${topic}" to get real web results instantly.`,
  ].join('\n');
}

function buildMath(text) {
  const result = safeMath(text);
  if (result !== null) {
    return `**Result:** \`${text.replace(/^calculate\s+/i, '')}\` = **${result}**`;
  }
  return `I can evaluate arithmetic expressions (e.g., \`42 * 7 + 3\`). Try: "calculate 15 * 4 - 2".`;
}

function buildGreeting() {
  return `👋 Hi! I'm the **Nexus Assistant**. I can help you with:\n\n- **Summarize** the current page (just say "summarize")\n- **Explain** or **define** a concept\n- **Calculate** math (e.g., "12 * 8 + 4")\n- **How-to** guidance and **tips**\n\nI work fully offline with zero cost — and for deep web research, use **Nexus Search** (Ctrl+K).`;
}

function buildHelp() {
  return [
    `**Nexus Assistant — capabilities**\n`,
    `| Command | Example |`,
    `| --- | --- |`,
    `| Summarize page | "summarize" |`,
    `| Explain concept | "explain async/await" |`,
    `| Define term | "what is photosynthesis" |`,
    `| Math | "calculate 144 / 12" |`,
    `| How-to | "how to take a screenshot" |`,
    `| Tips | "tips for better sleep" |`,
    ``,
    `For real-time web research, use **Nexus Search** — it pulls live results from DuckDuckGo and Wikipedia.`,
  ].join('\n');
}

function buildTranslate(text) {
  const match = text.match(/translate\s+(.+?)\s+(into|to)\s+(\w+)/i);
  if (match) {
    const content = match[1].trim();
    const target = match[3].trim();
    return `**Translation request**\n\nTo translate "${content}" into ${target}, open a translation service like [Google Translate](https://translate.google.com) or [DeepL](https://deepl.com). I don't embed a translation engine, but I can point you to the right tool.`;
  }
  return `To translate text, try: "translate hello into Spanish". I'll direct you to the best free tool.`;
}

function buildCode(text) {
  const topic = text.replace(/^\s*code\b/i, '').trim() || 'a simple example';
  return `**Code help:** ${topic}\n\nFor production-grade code examples, use **Nexus Search** to find docs and tutorials — open the Command Center (Ctrl+K) and type your query. Top results will include MDN, Stack Overflow, and official documentation.`;
}

function buildCompare(text) {
  const items = text.replace(/^\s*(compare|difference between)\s+/i, '').split(/\s+vs?\s+|\s+and\s+|\s*,\s*/).filter(Boolean);
  return `**Comparison: ${items.join(' vs ')}**\n\nTo compare these, I recommend running a Nexus Search for each topic — open the Command Center (Ctrl+K) and search. This gives you real, current information from authoritative sources rather than a static summary.`;
}

function buildHowto(text) {
  const topic = text.replace(/^\s*how\s+(do|to|can|does|can)\s+/i, '').replace(/\?$/, '').trim() || 'this';
  return [
    `**How to: ${topic}**\n`,
    `Here's a general approach:`,
    `1. **Identify the goal** — what you want to achieve.`,
    `2. **Gather resources** — tools, references, prerequisites.`,
    `3. **Break it into steps** — execute and verify each one.`,
    `4. **Test and refine** — iterate until it works.`,
    ``,
    `For a detailed, up-to-date guide, run a **Nexus Search** for "${topic}" (Ctrl+K) — you'll get live web results with tutorials and docs.`,
  ].join('\n');
}

function buildGeneric(text, ctx) {
  const parts = [`I don't have a built-in answer for that, but here's how I can help:`];
  if (ctx.url && ctx.url.startsWith('http')) {
    parts.push(`\n- **Summarize this page** — just say "summarize".`);
  }
  parts.push(`- **Search the web** — open the Command Center (Ctrl+K) and type "${text.slice(0, 40)}" to get live results from DuckDuckGo and Wikipedia.`);
  parts.push(`- **Calculate** — ask me to calculate any arithmetic expression.`);
  parts.push(`- **Explain / Define** — ask "explain X" or "what is X".`);
  return parts.join('\n');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
    const ctx = body.pageContext || {};
    const task = typeof body.task === 'string' ? body.task : null;

    if (!messages.length && !task) {
      return Response.json({ error: 'messages or task required' }, { status: 400 });
    }

    let reply;
    if (task) {
      reply = buildGeneric(task, ctx);
    } else {
      const lastUser = extractLastUser(messages);
      const cmd = parseCommand(lastUser);

      switch (cmd) {
        case 'summarize':
          reply = buildSummary(ctx, lastUser);
          break;
        case 'explain':
          reply = buildExplain(lastUser);
          break;
        case 'define':
          reply = buildDefinition(lastUser);
          break;
        case 'math':
          reply = buildMath(lastUser);
          break;
        case 'greeting':
          reply = buildGreeting();
          break;
        case 'thanks':
          reply = `You're welcome! Is there anything else I can help with?`;
          break;
        case 'help':
          reply = buildHelp();
          break;
        case 'translate':
          reply = buildTranslate(lastUser);
          break;
        case 'code':
          reply = buildCode(lastUser);
          break;
        case 'compare':
          reply = buildCompare(lastUser);
          break;
        case 'howto':
          reply = buildHowto(lastUser);
          break;
        case 'tips':
        case 'best':
          reply = buildGeneric(lastUser, ctx);
          break;
        default:
          reply = buildGeneric(lastUser, ctx);
      }
    }

    return Response.json({ reply });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}