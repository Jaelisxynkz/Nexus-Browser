import React, { useState, useRef, useCallback, useEffect } from "react";
import { X, Maximize2, Grid3x3, Save, RotateCcw } from "lucide-react";
import { faviconFor } from "./useBrowser";
import { useSound } from "./Sound";

/**
 * SpatialCanvas — a zoomable, pannable canvas where tabs become movable cards.
 *
 * Optional mode — normal users never see this unless they open it.
 *
 * Features:
 *  - Pan (drag background) and zoom (wheel)
 *  - Tabs as cards with favicon, title, domain color
 *  - Drag cards to rearrange
 *  - Auto-arrange into clusters by domain
 *  - Save layout to localStorage
 *  - Restore saved layout
 *
 * This is a genuine spatial browsing environment, not a gimmick — the layout
 * persists and can be recalled, and cards are live links to real tabs.
 */
export default function SpatialCanvas({ tabs, onFocusTab, onCloseTab, onCloseCanvas }) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [positions, setPositions] = useState({});
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const { play } = useSound();

  // Initialize positions: spiral layout if none saved
  useEffect(() => {
    if (Object.keys(positions).length === 0 && tabs.length > 0) {
      const saved = localStorage.getItem("nexus_spatial_layout");
      if (saved) {
        try {
          setPositions(JSON.parse(saved));
          return;
        } catch {}
      }
      // Spiral layout
      const cx = 0, cy = 0;
      const angleStep = Math.PI / 3;
      const radiusStep = 120;
      const init = {};
      tabs.forEach((t, i) => {
        const angle = i * angleStep;
        const radius = radiusStep * Math.sqrt(i + 1);
        init[t.id] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
      });
      setPositions(init);
    }
  }, [tabs]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setZoom((z) => Math.min(2, Math.max(0.3, z + delta)));
  }, []);

  const onCanvasMouseDown = (e) => {
    if (e.target === canvasRef.current) {
      setDragging("canvas");
      setDragOffset({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const onCardMouseDown = (e, tabId) => {
    e.stopPropagation();
    setDragging(tabId);
    const pos = positions[tabId] || { x: 0, y: 0 };
    setDragOffset({ x: e.clientX / zoom - pos.x, y: e.clientY / zoom - pos.y });
  };

  const onMouseMove = (e) => {
    if (!dragging) return;
    if (dragging === "canvas") {
      setPan({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    } else {
      setPositions((prev) => ({
        ...prev,
        [dragging]: { x: e.clientX / zoom - dragOffset.x, y: e.clientY / zoom - dragOffset.y },
      }));
    }
  };

  const onMouseUp = () => {
    setDragging(null);
    if (dragging && dragging !== "canvas") play("click");
  };

  const autoArrange = () => {
    // Cluster by domain
    const byDomain = {};
    tabs.forEach((t) => {
      let d = "other";
      try { d = new URL(t.url).hostname.replace(/^www\./, ""); } catch {}
      if (!byDomain[d]) byDomain[d] = [];
      byDomain[d].push(t);
    });
    const domains = Object.keys(byDomain);
    const init = {};
    domains.forEach((d, di) => {
      const cx = (di % 3) * 360 - 360;
      const cy = Math.floor(di / 3) * 320 - 160;
      byDomain[d].forEach((t, ti) => {
        init[t.id] = { x: cx + (ti % 2) * 180, y: cy + Math.floor(ti / 2) * 100 };
      });
    });
    setPositions(init);
    play("click");
  };

  const saveLayout = () => {
    localStorage.setItem("nexus_spatial_layout", JSON.stringify(positions));
    play("click");
  };

  const domainColor = (url) => {
    try {
      const h = new URL(url).hostname;
      let hash = 0;
      for (let i = 0; i < h.length; i++) hash = h.charCodeAt(i) + ((hash << 5) - hash);
      return `hsl(${Math.abs(hash) % 360} 70% 60%)`;
    } catch {
      return "#60a5fa";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-border/40 bg-card px-4">
        <div className="flex items-center gap-3">
          <Grid3x3 className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-foreground">Spatial Canvas</span>
          <span className="text-[11px] text-muted-foreground">{tabs.length} tabs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={autoArrange} className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-[12px] text-foreground hover:bg-muted/80">
            <Grid3x3 className="h-3.5 w-3.5" /> Arrange
          </button>
          <button onClick={saveLayout} className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-[12px] text-foreground hover:bg-muted/80">
            <Save className="h-3.5 w-3.5" /> Save layout
          </button>
          <button onClick={() => setZoom(1)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted" title="Reset zoom">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button onClick={onCloseCanvas} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/20 hover:text-destructive">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          background: "radial-gradient(circle at 50% 50%, hsl(var(--muted) / 0.3) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        onWheel={onWheel}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div
          className="absolute origin-top-left"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          {tabs.map((tab) => {
            const pos = positions[tab.id] || { x: 0, y: 0 };
            const color = domainColor(tab.url);
            return (
              <div
                key={tab.id}
                onMouseDown={(e) => onCardMouseDown(e, tab.id)}
                onDoubleClick={() => onFocusTab(tab.id)}
                className="absolute cursor-move rounded-xl border border-border/50 bg-card shadow-lg transition-shadow hover:shadow-xl hover:border-accent/40"
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: 160,
                  borderTop: `3px solid ${color}`,
                }}
              >
                <div className="flex items-center gap-2 border-b border-border/30 px-3 py-2">
                  <img src={faviconFor(tab.url)} alt="" className="h-4 w-4 rounded-sm" />
                  <span className="flex-1 truncate text-[11px] font-medium text-foreground">{tab.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }}
                    className="grid h-4 w-4 place-items-center rounded text-muted-foreground/60 hover:bg-destructive/20 hover:text-destructive"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
                <div className="px-3 py-2 text-[9px] text-muted-foreground/60 truncate">
                  {(() => { try { return new URL(tab.url).hostname; } catch { return tab.url; } })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer hint */}
      <div className="flex h-8 items-center justify-center gap-4 border-t border-border/30 bg-card px-4 text-[10px] text-muted-foreground">
        <span>Drag cards to move</span>
        <span>Drag background to pan</span>
        <span>Scroll to zoom</span>
        <span>Double-click a card to focus</span>
      </div>
    </div>
  );
}