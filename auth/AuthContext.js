import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logOut as apiLogOut } from "../services/api";
import {
  setCurrentSession,
  onSessionExpired,
  onDemoAccountsChange,
  rememberDemoAccount,
  setDemoAccountsLoader,
  loadDemoAccounts,
} from "../services/authService";
import { accountStateOf, hasSafeCustomerIdentity } from "../services/customerService";
import { useDemo } from "../demo/DemoContext";

// Session = { token, user: { email, name, companyName, customerId, activity }, profileComplete }. Stored encrypted with
// SecureStore (Keychain / Keystore) so the user stays logged in across app restarts. customerId is the MAZ
// customer the login belongs to (null for a New User with no customer yet) — set by the auth provider, which is
// MOCK today (services/authService.js).
const SESSION_KEY = "maz.session";
// Not sensitive (no account data): "1" once anyone has signed in on this device. Welcome uses it to choose its
// tagline (returning vs new). Kept across logouts — that's the point.
const SIGNED_IN_BEFORE_KEY = "maz.hasSignedInBefore";
// DEMO ONLY (mock auth): the New User demo accounts created on this phone — email, name, company, activity, verified;
// never the mobile, nationality or CPR / passport — so a New User who logs in after an app restart is still a New User
// instead of MAZ's demo customer. Encrypted like the session. Remove with the mock auth provider.
const DEMO_ACCOUNTS_KEY = "maz.demoAccounts";

// How the mock auth layer reads the saved list. A read or parse failure REJECTS: the mock layer then refuses logins
// ("Try again" on Login re-reads) instead of guessing who an unknown email is (services/mockApi.js loadDemoAccounts).
setDemoAccountsLoader(async () => {
  const saved = await SecureStore.getItemAsync(DEMO_ACCOUNTS_KEY);
  return saved ? JSON.parse(saved) : null;
});
function saveDemoAccounts(accounts) {
  SecureStore.setItemAsync(DEMO_ACCOUNTS_KEY, JSON.stringify(accounts)).catch(() => {});
}

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
// the first screen's API calls already see the new session (and its customer id).
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

  // Saved demo accounts follow every change (sign-up, verification, profile edit).
  useEffect(() => onDemoAccountsChange(saveDemoAccounts), []);

  useEffect(() => {
    if (!demoReady || restored.current) return;
    restored.current = true;
    const loadSignedInBefore = AsyncStorage.getItem(SIGNED_IN_BEFORE_KEY)
      .then((value) => setHasSignedInBefore(value === "1"))
      .catch(() => {});
    const accountsLoaded = loadDemoAccounts();
    if (startAtWelcome) {
      Promise.all([persist(null), loadSignedInBefore, accountsLoaded]).finally(() => setReady(true));
      return;
    }
    const loadSession = accountsLoaded
      .then(() => SecureStore.getItemAsync(SESSION_KEY))
      .then((saved) => {
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (!parsed?.token || !parsed?.user?.email) return;
        // Sessions saved before customer identity existed have no customerId at all — they can't say whose
        // data to load, so they're discarded and the user logs in again.
        if (!("customerId" in parsed.user)) {
          persist(null);
          return;
        }
        // A session with a customer id must carry an identity allowed to have one (services/customerService.js). One
        // that can't — e.g. saved before identities existed (2026-10-10), when a New User logging in after a restart
        // could be given the demo customer — is discarded: log in again, and nothing of MAZ's is loaded meanwhile.
        if (parsed.user.customerId != null && !hasSafeCustomerIdentity(parsed.user)) {
          persist(null);
          setSessionExpired(true);
          return;
        }
        // A restored New User keeps being one after logging out and back in (sessions saved before the demo
        // accounts were remembered).
        if (parsed.user.customerId == null) rememberDemoAccount(parsed.user);
        setSession(parsed);
        markSignedInBefore();
      })
      .catch(() => {});
    Promise.all([loadSession, loadSignedInBefore]).finally(() => setReady(true));
  }, [demoReady, startAtWelcome, setSession, markSignedInBefore]);

  // Called with logIn()'s result, or verifyEmail()'s session after a New User sign-up.
  const signIn = useCallback(
    ({ token, user }) => {
      setSession({
        token,
        user: {
          email: user.email,
          name: user.name,
          companyName: user.companyName ?? null,
          customerId: user.customerId ?? null,
          // Which kind of account this is ("demoTenant" | "newUser" while auth is mock) — only some identities may
          // load MAZ customer data (services/customerService.js hasSafeCustomerIdentity).
          identity: user.identity ?? null,
          // A New User's sign-up Activity (SAMPLE options, app-only — never sent to MAZ); null otherwise, and in
          // sessions saved before it existed.
          activity: user.activity ?? null,
        },
        profileComplete: user.profileComplete !== false,
      });
      setSessionExpired(false);
      markSignedInBefore();
    },
    [setSession, markSignedInBefore]
  );

  const completeProfile = useCallback(
    (name) => {
      if (!session) return;
      setSession({ ...session, profileComplete: true, user: { ...session.user, name: name || session.user.name } });
      setJustCompletedProfile(true);
    },
    [session, setSession]
  );

  // After EditProfile saves: the name and company the app shows and sends with requests.
  const updateUserDetails = useCallback(
    ({ name, companyName }) => {
      if (!name || !session) return;
      setSession({
        ...session,
        user: { ...session.user, name, companyName: companyName || session.user.companyName },
      });
    },
    [session, setSession]
  );

  const signOut = useCallback(async () => {
    await apiLogOut().catch(() => {}); // best effort — never blocks logging out
    setSession(null);
    setJustCompletedProfile(false);
  }, [setSession]);

  // MAZ rejected the session (401): sign out locally and let Login explain why. services/httpClient.js calls this
  // only for a 401 to a request that carried a token — and only a real auth provider's token is ever sent, so it
  // can't fire while auth is mock (a tokenless 401 is reported as NOT_AUTHORIZED instead).
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
