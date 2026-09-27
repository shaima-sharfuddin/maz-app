import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { logOut as apiLogOut } from "../services/api";
import { useDemo } from "../demo/DemoContext";

// Session = { token, user: { email, name }, profileComplete }. Stored encrypted with SecureStore
// (Keychain / Keystore) so the user stays logged in across app restarts.
const SESSION_KEY = "maz.session";

const AuthContext = createContext(null);

async function persist(session) {
  try {
    if (session) await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
    else await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // Storage unavailable (e.g. web preview): the session just won't survive a restart.
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  // In-memory only: lets the dashboard show "Profile saved" right after onboarding.
  const [justCompletedProfile, setJustCompletedProfile] = useState(false);

  // DEMO ONLY: with Settings → Demo data → "Always start at Welcome" on, launch discards the saved
  // session instead of restoring it. Waits for the demo settings to load; runs once per launch.
  const { ready: demoReady, startAtWelcome } = useDemo();
  const restored = useRef(false);

  useEffect(() => {
    if (!demoReady || restored.current) return;
    restored.current = true;
    if (startAtWelcome) {
      persist(null).finally(() => setReady(true));
      return;
    }
    SecureStore.getItemAsync(SESSION_KEY)
      .then((saved) => {
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (parsed?.token && parsed?.user?.email) setSession(parsed);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [demoReady, startAtWelcome]);

  // Called with logIn()'s result.
  const signIn = useCallback(({ token, user }) => {
    const next = {
      token,
      user: { email: user.email, name: user.name },
      profileComplete: user.profileComplete !== false,
    };
    setSession(next);
    persist(next);
  }, []);

  const completeProfile = useCallback((name) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, profileComplete: true, user: { ...prev.user, name: name || prev.user.name } };
      persist(next);
      return next;
    });
    setJustCompletedProfile(true);
  }, []);

  const signOut = useCallback(async () => {
    await apiLogOut().catch(() => {}); // best effort — never blocks logging out
    setSession(null);
    setJustCompletedProfile(false);
    await persist(null);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      isSignedIn: Boolean(session),
      user: session?.user ?? null,
      token: session?.token ?? null,
      profileComplete: session?.profileComplete ?? false,
      justCompletedProfile,
      signIn,
      completeProfile,
      signOut,
    }),
    [ready, session, justCompletedProfile, signIn, completeProfile, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside <AuthProvider>");
  return auth;
}
