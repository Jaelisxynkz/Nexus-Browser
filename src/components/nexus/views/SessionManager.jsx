import React, { useState, useEffect, useCallback } from "react";
import {
  Save, History, Clock, Trash2, Copy, Download, Upload, RotateCcw,
  Layers, Star, Calendar, FileJson,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useSound } from "../Sound";

import { loadSessions, saveSessions } from "../sessionStore";

export default function SessionManager({ tabs, activeId, onRestore, onSave }) {
  const [sessions, setSessions] = useState([]);
  const [autoSnapshots, setAutoSnapshots] = useState([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const { toast } = useToast();
  const { play } = useSound();

  useEffect(() => {
    setSessions(loadSessions());
    try {
      setAutoSnapshots(JSON.parse(localStorage.getItem("nexus_auto_snapshots") || "[]"));
    } catch { setAutoSnapshots([]); }
  }, []);

  const saveCurrent = useCallback((label) => {
    const snapshot = {
      id: Date.now(),
      name: label || `Session ${new Date().toLocaleString()}`,
      created: new Date().toISOString(),
      tabs: tabs.map((t) => ({ url: t.url, title: t.title, pinned: !!t.pinned })),
      activeId,
    };
    const all = loadSessions();
    all.unshift(snapshot);
    saveSessions(all.slice(0, 50));
    setSessions(loadSessions());
    play("success");
    toast({ title: "Session Saved", description: `"${snapshot.name}" — ${snapshot.tabs.length} tabs` });
  }, [tabs, activeId, play, toast]);

  const restore = (session) => {
    play("toggleOn");
    toast({ title: "Session restored", description: `Opened ${session.tabs.length} tabs` });
    onRestore?.(session.tabs);
  };

  const remove = (id) => {
    saveSessions(loadSessions().filter((s) => s.id !== id));
    setSessions(loadSessions());
    play("tabClose");
  };

  const duplicate = (session) => {
    const copy = { ...session, id: Date.now(), name: session.name + " (copy)", created: new Date().toISOString() };
    const all = loadSessions();
    all.unshift(copy);
    saveSessions(all.slice(0, 50));
    setSessions(loadSessions());
    play("success");
  };

  const exportSession = (session) => {
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `nexus-session-${session.id}.json`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Session exported" });
  };

  const importSession = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (parsed.tabs && Array.isArray(parsed.tabs)) {
          const imported = { ...parsed, id: Date.now(), imported: true };
          const all = loadSessions();
          all.unshift(imported);
          saveSessions(all.slice(0, 50));
          setSessions(loadSessions());
          toast({ title: "Session imported", description: `${imported.tabs.length} tabs` });
        }
      } catch { toast({ title: "Invalid session file", variant: "destructive" }); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-purple-500/20 to-accent/20 text-accent">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground font-display">Session Manager</h1>
            <p className="text-[12px] text-muted-foreground">{sessions.length} saved · {tabs.length} current tabs</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-[11px] text-muted-foreground cursor-pointer hover:bg-muted/70">
            <Upload className="h-3 w-3" /> Import
            <input type="file" accept=".json" onChange={importSession} className="hidden" />
          </label>
          <button onClick={() => setNaming(true)} className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-medium text-accent-foreground hover:opacity-90">
            <Save className="h-3 w-3" /> Save Current
          </button>
        </div>
      </div>

      {naming && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-border/40 bg-card p-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Session name (e.g. Research Project)" className="flex-1 rounded-lg bg-muted px-3 py-1.5 text-[13px] outline-none placeholder:text-muted-foreground" autoFocus />
          <button onClick={() => { saveCurrent(name); setNaming(false); setName(""); }} className="rounded-lg bg-accent px-3 py-1.5 text-[12px] text-accent-foreground">Save</button>
          <button onClick={() => setNaming(false)} className="rounded-lg px-2 py-1.5 text-[12px] text-muted-foreground">Cancel</button>
        </div>
      )}

      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground/50" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Saved Sessions</span>
        </div>
        {sessions.length === 0 ? (
          <div className="rounded-xl border border-border/30 bg-card/40 p-8 text-center">
            <Save className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-[13px] text-muted-foreground">No saved sessions yet. Click "Save Current" to snapshot your tabs.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((s) => (
              <div key={s.id} className="group flex items-center gap-3 rounded-xl border border-border/30 bg-card/40 p-3 transition hover:border-accent/30">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent">
                  <Layers className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-foreground">{s.name}</div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                    <Calendar className="h-3 w-3" />
                    {new Date(s.created).toLocaleString()}
                    <span>·</span>
                    <span>{s.tabs.length} tabs</span>
                    {s.imported && <span className="rounded bg-sky-500/15 px-1 text-sky-400">IMPORTED</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <button onClick={() => restore(s)} title="Restore" className="grid h-7 w-7 place-items-center rounded text-accent hover:bg-accent/15">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => duplicate(s)} title="Duplicate" className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-muted">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => exportSession(s)} title="Export" className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-muted">
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => remove(s.id)} title="Delete" className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-destructive/20 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}