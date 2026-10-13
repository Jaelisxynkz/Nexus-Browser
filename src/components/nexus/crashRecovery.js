/**
 * crashRecovery — startup recovery & abnormal-shutdown detection.
 *
 * A heartbeat marks the app "running"; a clean shutdown clears the mark.
 * If the next launch finds the mark still set, the previous run ended
 * abnormally and we surface recovery options. Session state is snapshotted
 * separately from app binaries so recovery never touches user data.
 *
 * In the desktop shell the same logic is backed by the user-data directory
 * (see desktop/); the web build uses localStorage as the durable store.
 */

const FLAG_KEY = "nexus.crash.flag.v1";
const SESSION_KEY = "nexus.crash.session.v1";
const WINDOW_KEY = "nexus.window.state.v1";

export const RECOVERY_REASON = {
  NONE: "none",
  ABNORMAL_SHUTDOWN: "abnormal-shutdown",
  UPDATE_FAILURE: "update-failure",
};

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/** Call once at startup. Returns recovery info if the last run ended badly. */
export function detectAbnormalShutdown() {
  const flag = read(FLAG_KEY, null);
  if (flag && flag.running === true) {
    return {
      crashed: true,
      reason: RECOVERY_REASON.ABNORMAL_SHUTDOWN,
      at: flag.at || null,
      session: read(SESSION_KEY, null),
    };
  }
  return { crashed: false, reason: RECOVERY_REASON.NONE };
}

/** Mark the app as running; begin the heartbeat. Returns a stop function. */
export function beginHeartbeat(getSessionSnapshot) {
  const mark = () => write(FLAG_KEY, { running: true, at: new Date().toISOString() });
  mark();
  const interval = setInterval(() => {
    mark();
    if (typeof getSessionSnapshot === "function") {
      try { write(SESSION_KEY, getSessionSnapshot()); } catch {}
    }
  }, 4000);

  const clean = () => {
    clearInterval(interval);
    write(FLAG_KEY, { running: false, at: new Date().toISOString() });
  };
  // Clean shutdown on page hide / unload (best-effort; a crash skips this).
  window.addEventListener("pagehide", clean);
  window.addEventListener("beforeunload", clean);
  return clean;
}

/** Last heartbeat snapshot (survives clean shutdowns) — used by "Continue where you left off". */
export function loadLastSession() {
  return read(SESSION_KEY, null);
}

/** Persist a session snapshot for recovery. */
export function saveSessionSnapshot(snapshot) {
  write(SESSION_KEY, { ...snapshot, savedAt: new Date().toISOString() });
}

/** Clear the recovery snapshot once the user has chosen Start Clean. */
export function clearRecovery() {
  write(FLAG_KEY, { running: false, at: new Date().toISOString() });
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

/* ---- Window state persistence (restore size/position across launches) ---- */
export function saveWindowState(state) {
  write(WINDOW_KEY, { ...state, at: new Date().toISOString() });
}
export function loadWindowState() {
  return read(WINDOW_KEY, null);
}