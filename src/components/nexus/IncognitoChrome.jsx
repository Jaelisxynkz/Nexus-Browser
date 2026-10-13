import React from "react";
import { EyeOff, X, Shield } from "lucide-react";

/**
 * IncognitoBadge — the subtle but unmistakable PRIVATE indicator.
 * Shown in the tab strip and navbar when a private session is active.
 * Not a giant banner — just a clear state cue.
 */
export function IncognitoBadge({ compact = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-300 ring-1 ring-violet-500/30`}
      title="Private session active"
    >
      <EyeOff className="h-3 w-3" />
      {!compact && "Private"}
    </span>
  );
}

/**
 * ClosePrivateSession — the fast exit action.
 * Calls onConfirm which performs the configured cleanup in the shell.
 */
export default function IncognitoChrome({ open, active, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div className="nx-reveal w-full max-w-md rounded-2xl border border-violet-500/30 bg-popover p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/15 text-violet-300">
            <EyeOff className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Close Private Session?</h2>
            <p className="text-[11px] text-muted-foreground">Closes all private tabs and clears Nexus-owned private data.</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border/40 bg-card/40 p-3 text-[11px] leading-relaxed text-muted-foreground/80">
          <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground"><Shield className="h-3.5 w-3.5 text-violet-300" /> What gets cleared</div>
          Private history, private search terms, private workspace state, and the in-memory private store.
          <div className="mt-1.5 text-amber-400/80">Cookies, cache & site storage require the native runtime to fully clear. OS-level traces may persist.</div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-muted">Cancel</button>
          <button onClick={onConfirm} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-violet-500">
            <X className="h-3.5 w-3.5" /> Close & Clear
          </button>
        </div>
      </div>
    </div>
  );
}