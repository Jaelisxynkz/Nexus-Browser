// Saved session snapshots (named tab sets), shared by Session Manager and Command Center.
const STORAGE_KEY = "nexus_sessions";

export function loadSessions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

export function saveSessions(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
}

export function snapshotTabs(tabs, activeId, name) {
  const snapshot = {
    id: Date.now(),
    name: name || `Session ${new Date().toLocaleString()}`,
    created: new Date().toISOString(),
    tabs: tabs.map((t) => ({ url: t.url, title: t.title, pinned: !!t.pinned })),
    activeId,
  };
  saveSessions([snapshot, ...loadSessions()]);
  return snapshot;
}