import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// DEMO ONLY — chooses which mock data the app shows while there's no backend
// ("tenant" = contracts dashboard, "newUser" = no lease yet). Toggled in Settings.
// Remove this provider (and the Settings section) once real account data exists.
const STORAGE_KEY = "maz.demoUserState";
export const DEMO_USER_STATES = ["tenant", "newUser"];
const DEFAULT_USER_STATE = "tenant";

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [userState, setUserStateValue] = useState(DEFAULT_USER_STATE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (DEMO_USER_STATES.includes(saved)) setUserStateValue(saved);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setUserState = useCallback((next) => {
    setUserStateValue(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo(() => ({ userState, setUserState, ready }), [userState, setUserState, ready]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const demo = useContext(DemoContext);
  if (!demo) throw new Error("useDemo must be used inside <DemoProvider>");
  return demo;
}
