import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logOut as apiLogOut } from "../services/api";
import { setCurrentSession, onSessionExpired, restoreSession, withUserDetails } from "../services/authService";
import { accountStateOf } from "../services/customerService";
import { useDemo } from "../demo/DemoContext";

// Session = { token, user: { email, name, companyName, customerId, identity, … }, profileComplete } — issued by the MAZ
// login (services/mazAuth.js). Stored encrypted with SecureStore (Keychain / Keystore) so the user stays logged in across
// app restarts; the token is sent as "Authorization: Bearer …" on every MAZ request. customerId is the MAZ customer the
// login belongs to (null → New User dashboard).
const SESSION_KEY = "maz.session";
// Not sensitive (no account data): "1" once anyone has signed in on this device. Welcome uses it to choose its
// tagline (returning vs new). Kept across logouts — that's the point.
const SIGNED_IN_BEFORE_KEY = "maz.hasSignedInBefore";
// Left on phones by the removed mock login (its remembered demo accounts) — deleted at launch.
const LEGACY_DEMO_ACCOUNTS_KEY = "maz.demoAccounts";

const AuthContext = createContext(null);

async function persist(session) {
  try {
    if (session) await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
    else await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // Storage unavailable (e.g. web preview): the session just won't survive a restart.
  }
}

// Every session change goes through here: the data layer (services/authService.js) is told synchronously, so
// the first screen's API calls already see the new session (its token and customer id). Sessions are the verified
// objects services/liveAuth.js issued — stored as they are, never rebuilt here (a copy wouldn't be verified).
function useSessionState() {
  const [session, setSessionState] = useState(null);
  const setSession = useCallback((next) => {
    setCurrentSession(next);
    setSessionState(next);
    persist(next);
  }, []);
  return [session, setSession];
}

export function AuthProvider({ children }) {
  const [session, setSession] = useSessionState();
  const [ready, setReady] = useState(false);
  // In-memory only: lets the dashboard show "Profile saved" right after onboarding.
  const [justCompletedProfile, setJustCompletedProfile] = useState(false);
  // In-memory only: the last sign-out was forced by MAZ rejecting the session (401) — Login says so.
  const [sessionExpired, setSessionExpired] = useState(false);
  const [hasSignedInBefore, setHasSignedInBefore] = useState(false);
  // Any session (a sign-in or a restored one) marks the device as returning, for Welcome's tagline.
  const markSignedInBefore = useCallback(() => {
    setHasSignedInBefore(true);
    AsyncStorage.setItem(SIGNED_IN_BEFORE_KEY, "1").catch(() => {});
  }, []);

  // DEMO ONLY: with Settings → Demo data → "Always start at Welcome" on, launch discards the saved
  // session instead of restoring it. Waits for the demo settings to load; runs once per launch.
  const { ready: demoReady, startAtWelcome } = useDemo();
  const restored = useRef(false);

  useEffect(() => {
    if (!demoReady || restored.current) return;
    restored.current = true;
    const loadSignedInBefore = AsyncStorage.getItem(SIGNED_IN_BEFORE_KEY)
      .then((value) => setHasSignedInBefore(value === "1"))
      .catch(() => {});
    SecureStore.deleteItemAsync(LEGACY_DEMO_ACCOUNTS_KEY).catch(() => {});
    if (startAtWelcome) {
      Promise.all([persist(null), loadSignedInBefore]).finally(() => setReady(true));
      return;
    }
    const loadSession = SecureStore.getItemAsync(SESSION_KEY)
      .then((saved) => {
        if (!saved) return;
        // Only a session the MAZ login issued can be restored (services/liveAuth.js restoreSession). Anything else —
        // e.g. a session from the removed demo login — is discarded and Login says the session expired. MAZ has no
        // GET /me to re-check the token: if it was revoked, the first request's 401 signs the user out.
        const restored = restoreSession(JSON.parse(saved));
        if (!restored) {
          persist(null);
          setSessionExpired(true);
          return;
        }
        setSession(restored);
        markSignedInBefore();
      })
      .catch(() => {});
    Promise.all([loadSession, loadSignedInBefore]).finally(() => setReady(true));
  }, [demoReady, startAtWelcome, setSession, markSignedInBefore]);

  // Called with logIn()'s result — the verified session the MAZ login issued.
  const signIn = useCallback(
    (session) => {
      setSession(session);
      setSessionExpired(false);
      markSignedInBefore();
    },
    [setSession, markSignedInBefore]
  );

  const completeProfile = useCallback(
    (name) => {
      if (!session) return;
      setSession(withUserDetails(session, { name, profileComplete: true }));
      setJustCompletedProfile(true);
    },
    [session, setSession]
  );

  // After EditProfile saves: the name and company the app shows and sends with requests.
  const updateUserDetails = useCallback(
    ({ name, companyName }) => {
      if (!name || !session) return;
      setSession(withUserDetails(session, { name, companyName }));
    },
    [session, setSession]
  );

  const signOut = useCallback(async () => {
    await apiLogOut().catch(() => {}); // best effort — never blocks logging out
    setSession(null);
    setJustCompletedProfile(false);
  }, [setSession]);

  // MAZ rejected the session (401): sign out locally and let Login explain why. services/http/apiClient.js calls this
  // only for a 401 to a request that carried the session's token (a tokenless 401 is NOT_AUTHORIZED instead).
  useEffect(() => {
    onSessionExpired(() => {
      setSession(null);
      setSessionExpired(true);
    });
  }, [setSession]);

  const value = useMemo(
    () => ({
      ready,
      isSignedIn: Boolean(session),
      user: session?.user ?? null,
      token: session?.token ?? null,
      profileComplete: session?.profileComplete ?? false,
      justCompletedProfile,
      sessionExpired,
      hasSignedInBefore,
      signIn,
      completeProfile,
      updateUserDetails,
      signOut,
    }),
    [
      ready,
      session,
      justCompletedProfile,
      sessionExpired,
      hasSignedInBefore,
      signIn,
      completeProfile,
      updateUserDetails,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside <AuthProvider>");
  return auth;
}

// "tenant" | "newUser" for the signed-in user — from the session's customerId (services/customerService.js
// accountStateOf), so the dashboard and every per-account-type mock always match the account. Signed out → "newUser".
export function useAccountState() {
  const { user } = useAuth();
  return accountStateOf(user);
}
