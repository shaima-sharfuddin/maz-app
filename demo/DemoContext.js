import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setMockFailuresEnabled } from "../services/mockApi";

// DEMO ONLY — controls the mock backend while there's no real one:
// (Which dashboard / mock account data to show is NOT a demo setting any more: it follows the signed-in account's
// customerId — useAccountState in auth/AuthContext.js. The old "maz.demoUserState" value saved on phones is simply
// no longer read.)
// - simulateErrors: whether mock API calls randomly fail (~15%) so error states get exercised. OFF by default.
// - startAtWelcome: every launch starts logged out at Welcome (the saved session is discarded), so a
//   demo can show sign-up / log-in from the start. Read by auth/AuthContext.js at launch.
// The Settings → "Demo data" section (developer controls) is hidden unless DEMO_CONTROLS_ENABLED. While hidden,
// simulateErrors and startAtWelcome are always off, so a value saved earlier can't stick where nobody can change it.
// Remove this provider (and the Settings section) once real account data exists.

// Build-time switch for developers: start the bundler with EXPO_PUBLIC_SHOW_DEMO_CONTROLS=true to show the
// Settings → "Demo data" section. Off by default (also in Expo Go / development), so normal users never see it.
export const DEMO_CONTROLS_ENABLED = process.env.EXPO_PUBLIC_SHOW_DEMO_CONTROLS === "true";
const SIMULATE_ERRORS_KEY = "maz.demoSimulateErrors";
const START_AT_WELCOME_KEY = "maz.demoStartAtWelcome";

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [simulateErrors, setSimulateErrorsValue] = useState(false);
  const [startAtWelcome, setStartAtWelcomeValue] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet([SIMULATE_ERRORS_KEY, START_AT_WELCOME_KEY])
      .then(([[, savedSimulateErrors], [, savedStartAtWelcome]]) => {
        if (!DEMO_CONTROLS_ENABLED) return; // developer settings are ignored while their controls are hidden
        setSimulateErrorsValue(savedSimulateErrors === "true");
        setStartAtWelcomeValue(savedStartAtWelcome === "true");
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // Keep the mock API's failure switch in sync with the setting.
  useEffect(() => {
    setMockFailuresEnabled(simulateErrors);
  }, [simulateErrors]);

  const setSimulateErrors = useCallback((next) => {
    setSimulateErrorsValue(next);
    AsyncStorage.setItem(SIMULATE_ERRORS_KEY, String(next)).catch(() => {});
  }, []);

  const setStartAtWelcome = useCallback((next) => {
    setStartAtWelcomeValue(next);
    AsyncStorage.setItem(START_AT_WELCOME_KEY, String(next)).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ simulateErrors, setSimulateErrors, startAtWelcome, setStartAtWelcome, ready }),
    [simulateErrors, setSimulateErrors, startAtWelcome, setStartAtWelcome, ready]
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const demo = useContext(DemoContext);
  if (!demo) throw new Error("useDemo must be used inside <DemoProvider>");
  return demo;
}
