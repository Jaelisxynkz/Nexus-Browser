import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import NexusServices from "./services";

const EntitlementContext = createContext({ plan: "free", features: [], loading: true, has: () => false, refresh: () => {} });

export function EntitlementProvider({ children }) {
  const [state, setState] = useState({ plan: "free", features: [], active: false, status: "none", loading: true });

  const refresh = useCallback(() => {
    return NexusServices.entitlements()
      .then((d) => setState({ ...d, loading: false }))
      .catch(() => setState((s) => ({ ...s, loading: false })));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const has = useCallback((f) => state.features.includes(f), [state.features]);

  return (
    <EntitlementContext.Provider value={{ ...state, has, refresh }}>
      {children}
    </EntitlementContext.Provider>
  );
}

export function useEntitlements() {
  return useContext(EntitlementContext);
}