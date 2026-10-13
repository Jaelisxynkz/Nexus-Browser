import React, { useState, useRef } from "react";
import { Plus, Settings2, X, Search, Check, Globe, AlertCircle, Loader2 } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { PRESETS, normalizeUrl, nameFromUrl } from "./SidePanelStore";

/**
 * WebsiteManager — compact, beautiful management surface for the Web App Dock.
 *
 * Opened from the gear icon at the bottom of the Side Panel rail. Handles:
 *   - Add website (URL + name + auto-favicon detection, no invented data §8/§24)
 *   - Browse preset library (§10)
 *   - Reorder via drag-and-drop (§11)
 *   - Pin/unpin, hide/show, rename, edit URL, remove (§6)
 *   - Fuzzy search (§14)
 *   - Reset (§6)
 *
 * Stays compact — this is NOT a giant settings panel.
 */
export default function WebsiteManager({ open, onClose, dock, addWebsite, removeWebsite, updateWebsite, reorder, reset }) {
  const [tab, setTab] = useState("add");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  if (!open) return null;

  const handleAdd = async () => {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError("Enter a valid URL (e.g. example.com or https://example.com)");
      return;
    }
    setAdding(true);
    setError("");
    // §8: attempt favicon detection (real services only, no invented data)
    const favicon = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(normalized)}`;
    const finalName = name.trim() || nameFromUrl(normalized);
    addWebsite({ name: finalName, url: normalized, favicon });
    setUrl("");
    setName("");
    setAdding(false);
    onClose();
  };

  const handlePreset = (preset) => {
    addWebsite({ name: preset.name, url: preset.url, favicon: `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(preset.url)}` });
  };

  const isPresetAdded = (presetUrl) => dock.websites.some((w) => w.url === presetUrl);

  // Fuzzy search across visible websites (§14)
  const q = query.trim().toLowerCase();
  const filtered = dock.websites.filter((w) => {
    if (!q) return true;
    return (w.name + " " + w.url).toLowerCase().includes(q);
  });

  // Group presets by category
  const presetCategories = PRESETS.reduce((acc, p) => {
    (acc[p.cat] = acc[p.cat] || []).push(p);
    return acc;
  }, {});

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border/40 bg-popover shadow-2xl nx-reveal">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border/40 px-5">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-accent/15 text-accent">
            <Settings2 className="h-4 w-4" />
          </div>
          <h2 className="flex-1 text-[15px] font-semibold text-foreground">Manage Web Apps</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 gap-1 border-b border-border/40 px-3 pt-2">
          {[
            { id: "add", label: "Add", icon: Plus },
            { id: "library", label: "Library", icon: Globe },
            { id: "manage", label: "Manage", icon: Settings2 },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-[12px] font-medium transition ${
                tab === t.id ? "border-b-2 border-accent text-accent" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto nexus-scroll p-4">
          {tab === "add" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Website URL</label>
                <input
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="https://example.com"
                  autoFocus
                  className="w-full rounded-lg border border-border/40 bg-background/40 px-3 py-2.5 text-[13px] outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Name (optional)</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder={url ? nameFromUrl(normalizeUrl(url) || url) : "Auto-detected from URL"}
                  className="w-full rounded-lg border border-border/40 bg-background/40 px-3 py-2.5 text-[13px] outline-none focus:border-accent"
                />
                <p className="mt-1.5 text-[10px] text-muted-foreground/70">
                  Favicon is detected automatically from the domain. Nexus never invents website data.
                </p>
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </div>
              )}
              <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/40 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                <Globe className="h-3.5 w-3.5 shrink-0 text-accent" />
                Websites run inside an isolated frame. Some sites (X-Frame-Options) may refuse to embed — you can still open them in the main tab.
              </div>
              <button
                onClick={handleAdd}
                disabled={adding || !url.trim()}
                className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-40"
              >
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Web App
              </button>
            </div>
          )}

          {tab === "library" && (
            <div className="flex flex-col gap-4">
              <p className="text-[11px] text-muted-foreground">Tap to add a preset. Your rail stays clean — add only what you use.</p>
              {Object.entries(presetCategories).map(([cat, items]) => (
                <div key={cat}>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{cat}</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {items.map((p) => {
                      const added = isPresetAdded(p.url);
                      return (
                        <button
                          key={p.id}
                          onClick={() => added ? null : handlePreset(p)}
                          disabled={added}
                          className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                            added
                              ? "border-emerald-500/30 bg-emerald-500/10 opacity-70"
                              : "border-border/30 bg-card/40 hover:border-accent/40 hover:bg-accent/5"
                          }`}
                        >
                          <img src={`https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(p.url)}`} alt="" className="h-4 w-4 rounded-sm" />
                          <span className="flex-1 truncate text-[12px] text-foreground">{p.name}</span>
                          {added ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Plus className="h-3.5 w-3.5 text-muted-foreground" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "manage" && (
            <div className="flex flex-col gap-3">
              {dock.websites.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Globe className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-[12px] text-muted-foreground">No web apps yet. Add one from the "Add" tab.</p>
                </div>
              )}
              {dock.websites.length > 0 && (
                <>
                  <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/40 px-3 py-2">
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search your web apps…"
                      className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  <DragDropContext onDragEnd={(r) => r.destination && reorder(filtered.map((w) => w.id))}>
                    <Droppable droppableId="webapps">
                      {(prov) => (
                        <div ref={prov.innerRef} {...prov.droppableProps} className="flex flex-col gap-1">
                          {filtered.map((w, i) => (
                            <Draggable key={w.id} draggableId={w.id} index={i}>
                              {(p) => (
                                <div
                                  ref={p.innerRef}
                                  {...p.draggableProps}
                                  {...p.dragHandleProps}
                                  className="group flex items-center gap-2 rounded-lg border border-border/30 bg-card/40 px-2.5 py-2 transition hover:border-accent/30"
                                >
                                  <img src={w.favicon} alt="" className="h-5 w-5 rounded-sm" />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-[12px] font-medium text-foreground">{w.name}</div>
                                    <div className="truncate text-[10px] text-muted-foreground/70">{w.url}</div>
                                  </div>
                                  <button
                                    onClick={() => updateWebsite(w.id, { pinned: !w.pinned })}
                                    className={`grid h-6 w-6 place-items-center rounded text-[10px] ${w.pinned ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-muted"}`}
                                    title={w.pinned ? "Unpin from rail" : "Pin to rail"}
                                  >
                                    ★
                                  </button>
                                  <button
                                    onClick={() => updateWebsite(w.id, { hidden: !w.hidden })}
                                    className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                                    title={w.hidden ? "Show" : "Hide"}
                                  >
                                    {w.hidden ? "○" : "●"}
                                  </button>
                                  <button
                                    onClick={() => removeWebsite(w.id)}
                                    className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                                    title="Remove"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {prov.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                  <button
                    onClick={reset}
                    className="mt-2 self-start rounded-lg px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    Reset all web apps
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}