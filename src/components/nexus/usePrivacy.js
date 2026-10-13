import { useCallback, useEffect, useRef, useState } from "react";
import {
  isPrivateActive, setPrivateActive, loadPrivacyConfig, savePrivacyConfig,
  loadSecurityConfig, saveSecurityConfig,
} from "./privacyEngine";

/**
 * usePrivacy — live privacy + security state for the whole app.
 *
 * Tracks: global privacy config, security config, the private-session flag,
 * and the in-memory private store that gets wiped on close.
 */
export function usePrivacy() {
  const [privacy, setPrivacy] = useState(null);
  const [security, setSecurity] = useState(null);
  const [privateOn, setPrivateOn] = useState(isPrivateActive());
  const [privateStore] = useState(() => ({})); // ephemeral; never persisted
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    loadPrivacyConfig().then(setPrivacy);
    loadSecurityConfig().then(setSecurity);
  }, []);

  useEffect(() => {
    const onMove = () => { lastActivity.current = Date.now(); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("keydown", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onMove);
    };
  }, []);

  const updatePrivacy = useCallback(async (patch) => {
    const next = await savePrivacyConfig(patch);
    setPrivacy(next);
    return next;
  }, []);

  const updateSecurity = useCallback(async (patch) => {
    const next = await saveSecurityConfig(patch);
    setSecurity(next);
    return next;
  }, []);

  const enterPrivate = useCallback(() => {
    setPrivateActive(true);
    setPrivateOn(true);
  }, []);

  const exitPrivate = useCallback(() => {
    // Wipe the in-memory private store. Cookie/cache/site-storage clearing
    // is handled by the native shell (desktopRuntime) when present.
    Object.keys(privateStore).forEach((k) => { delete privateStore[k]; });
    setPrivateActive(false);
    setPrivateOn(false);
  }, [privateStore]);

  // Inactivity auto-clear for the private session.
  useEffect(() => {
    if (!privateOn) return;
    const mins = privacy?.clearPrivateAfterInactivity || 0;
    if (!mins) return;
    const id = setInterval(() => {
      if (Date.now() - lastActivity.current > mins * 60 * 1000) exitPrivate();
    }, 15000);
    return () => clearInterval(id);
  }, [privateOn, privacy, exitPrivate]);

  return {
    privacy, security, privateOn, privateStore,
    updatePrivacy, updateSecurity, enterPrivate, exitPrivate,
  };
}