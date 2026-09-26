import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PALETTES } from "./theme";

const STORAGE_KEY = "maz.themePreference";
export const THEME_PREFERENCES = ["system", "light", "dark"];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme(); // "light" | "dark" | "unspecified" | null
  const [preference, setPreferenceState] = useState("system");
  const [ready, setReady] = useState(false);

  // Load the saved choice once. `ready` lets the app hold the splash screen until we know
  // which palette to paint, so the first frame is never the wrong theme.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (THEME_PREFERENCES.includes(saved)) setPreferenceState(saved);
      })
      .catch(() => {}) // storage unavailable: fall back to "system"
      .finally(() => setReady(true));
  }, []);

  const setPreference = useCallback((next) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const scheme = preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;

  const value = useMemo(
    () => ({ scheme, isDark: scheme === "dark", colors: PALETTES[scheme], preference, setPreference, ready }),
    [scheme, preference, setPreference, ready]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used inside <ThemeProvider>");
  return theme;
}
