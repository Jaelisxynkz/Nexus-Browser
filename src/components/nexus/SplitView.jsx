import React, { useState, useRef, useCallback } from "react";
import { Columns2, Rows2, Square, X, Maximize2, Minimize2 } from "lucide-react";
import WebView from "./WebView";

/**
 * SplitView — advanced pane tiling system.
 *
 * Layouts:
 *  - horizontal (left | right)
 *  - vertical (top / bottom)
 *  - 2x2 grid
 *
 * Features:
 *  - Resizable divider (drag to resize)
 *  - Swap, close, maximize/restore panes
 *  - Each pane renders a tab's WebView
 *
 * The layout lives in the browser shell, not in a page — it overlays the
 * main content area when enabled. Panes reference real tabs from useBrowser.
 */
const MIN_SIZE = 0.2;
const MAX_SIZE = 0.8;

export default function SplitView({ layout, panes, onResize, onClosePane, onSwap, onMaximize, onExit }) {
  const draggingRef = useRef(null);

  const onDividerMouseDown = (axis) => {
    document.body.style.cursor = axis === "h" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
    const onMove = (e) => {
      if (!draggingRef.current) return;
      const { id, bounds, axis } = draggingRef.current;
      const ratio = axis === "h"
        ? (e.clientX - bounds.left) / bounds.width
        : (e.clientY - bounds.top) / bounds.height;
      onResize(id, Math.min(MAX_SIZE, Math.max(MIN_SIZE, ratio)));
    };
    const onUp = () => {
      draggingRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const startDrag = (id, axis, e) => {
    const container = e.currentTarget.parentElement.getBoundingClientRect();
    draggingRef.current = { id, bounds: container, axis };
    onDividerMouseDown(axis);
  };

  if (!layout || panes.length < 2) return null;

  const renderPane = (pane, maximized) => {
    const tab = pane.tab;
    return (
      <div key={pane.id} className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-background">
        {tab ? (
          <WebView tab={tab} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[13px] text-muted-foreground/50">
            No tab in this pane
          </div>
        )}
        {/* Pane controls */}
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
          <button onClick={() => onSwap(pane.id)} className="grid h-6 w-6 place-items-center rounded-md bg-background/80 text-muted-foreground backdrop-blur hover:text-foreground" title="Swap panes">
            <Maximize2 className="h-3 w-3" />
          </button>
          {!maximized && (
            <button onClick={() => onMaximize(pane.id)} className="grid h-6 w-6 place-items-center rounded-md bg-background/80 text-muted-foreground backdrop-blur hover:text-foreground" title="Maximize">
              <Square className="h-3 w-3" />
            </button>
          )}
          <button onClick={() => onClosePane(pane.id)} className="grid h-6 w-6 place-items-center rounded-md bg-background/80 text-muted-foreground backdrop-blur hover:text-destructive" title="Close pane">
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  const layoutEl = (() => {
    if (layout === "horizontal" && panes.length >= 2) {
      const [left, right, ...rest] = panes;
      const restEl = rest.length > 0 ? renderPane(rest[0]) : null;
      return (
        <div className="flex min-h-0 flex-1">
          {renderPane(left)}
          <div
            className="w-1 cursor-col-resize bg-border/30 hover:bg-accent/60 transition-colors"
            onMouseDown={(e) => startDrag(left.id, "h", e)}
          />
          {renderPane(right)}
          {restEl}
        </div>
      );
    }
    if (layout === "vertical" && panes.length >= 2) {
      const [top, bottom, ...rest] = panes;
      const restEl = rest.length > 0 ? renderPane(rest[0]) : null;
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          {renderPane(top)}
          <div
            className="h-1 cursor-row-resize bg-border/30 hover:bg-accent/60 transition-colors"
            onMouseDown={(e) => startDrag(top.id, "v", e)}
          />
          {renderPane(bottom)}
          {restEl}
        </div>
      );
    }
    if (layout === "grid" && panes.length >= 4) {
      const [tl, tr, bl, br, ...rest] = panes;
      return (
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-1">
          {renderPane(tl)}
          {renderPane(tr)}
          {renderPane(bl)}
          {renderPane(br)}
          {rest.map((p) => renderPane(p))}
        </div>
      );
    }
    return null;
  })();

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background group">
      <div className="flex h-9 items-center justify-between border-b border-border/40 bg-card px-3">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Columns2 className="h-3.5 w-3.5 text-accent" />
          <span>Split View · {layout}</span>
        </div>
        <button onClick={onExit} className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-[11px] text-foreground hover:bg-muted/80">
          <X className="h-3 w-3" /> Exit split
        </button>
      </div>
      {layoutEl}
    </div>
  );
}

/* Layout selector helper */
export function SplitLayoutSelector({ onChoose }) {
  return (
    <div className="flex gap-2">
      <button onClick={() => onChoose("horizontal")} className="grid h-20 w-28 place-items-center rounded-lg border border-border/40 bg-muted/40 text-muted-foreground hover:border-accent/50 hover:text-accent">
        <div className="flex w-full gap-1 px-4">
          <div className="h-12 flex-1 rounded bg-border/40" /><div className="h-12 flex-1 rounded bg-border/40" />
        </div>
      </button>
      <button onClick={() => onChoose("vertical")} className="grid h-20 w-28 place-items-center rounded-lg border border-border/40 bg-muted/40 text-muted-foreground hover:border-accent/50 hover:text-accent">
        <div className="flex w-full flex-col gap-1 px-4">
          <div className="h-5 flex-1 rounded bg-border/40" /><div className="h-5 flex-1 rounded bg-border/40" />
        </div>
      </button>
      <button onClick={() => onChoose("grid")} className="grid h-20 w-28 place-items-center rounded-lg border border-border/40 bg-muted/40 text-muted-foreground hover:border-accent/50 hover:text-accent">
        <div className="grid w-full grid-cols-2 grid-rows-2 gap-1 px-4">
          <div className="h-5 rounded bg-border/40" /><div className="h-5 rounded bg-border/40" />
          <div className="h-5 rounded bg-border/40" /><div className="h-5 rounded bg-border/40" />
        </div>
      </button>
    </div>
  );
}