import * as mockAuth from "./mock/mockAuth";
import { demoSessionChanged } from "./mock/demoSession";
import { setAuthTokenProvider, setUnauthorizedHandler } from "./httpClient";
import { SERVICE_SOURCES } from "./serviceConfig";

// Authentication for the whole app: screens call logIn / logOut / requestPasswordReset (via services/api.js),
// auth/AuthContext.js keeps this module told about the current session, and the data layer reads the session
// from here (the token for MAZ requests, the customer id via services/customerService.js).

// ⚠️ AUTH PROVIDER: MOCK (services/mock/mockAuth.js) — MAZ has no login endpoint yet.
// Going live: create services/mazAuth.js with the same three functions (see mockAuth.js for the shapes),
// import it here instead, and set SERVICE_SOURCES.auth to "real".
const provider = mockAuth;

export const AUTH_IS_MOCK = SERVICE_SOURCES.auth !== "real";

export const logIn = (credentials) => provider.logIn(credentials);
export const logOut = () => provider.logOut();
export const requestPasswordReset = (email) => provider.requestPasswordReset(email);

// DEMO accounts remembered across app restarts (mock provider only — a real provider has its own accounts, so these
// are no-ops then). auth/AuthContext.js restores the saved list at launch and saves every change.
export const restoreDemoAccounts = (accounts) => (AUTH_IS_MOCK ? mockAuth.restoreAccounts(accounts) : undefined);
export const onDemoAccountsChange = (listener) => (AUTH_IS_MOCK ? mockAuth.onAccountsChange(listener) : () => {});
export const rememberDemoAccount = (user) => (AUTH_IS_MOCK ? mockAuth.rememberAccount(user) : undefined);
// AuthContext supplies how to read the saved list (SecureStore) and loads it at launch; logIn re-reads if needed.
export const setDemoAccountsLoader = (loader) => (AUTH_IS_MOCK ? mockAuth.setAccountsLoader(loader) : undefined);
export const loadDemoAccounts = () => (AUTH_IS_MOCK ? mockAuth.loadAccounts() : Promise.resolve());
// True for an email that is a New User DEMO account — such an account must never carry a MAZ customer id.
export const isDemoNewUserEmail = (email) => (AUTH_IS_MOCK ? mockAuth.isNewUserAccount(email) : false);

// ---- Current session (kept in sync by auth/AuthContext.js) -----------------------------------------------
// Set synchronously whenever the session changes, so a screen's first API call already sees it.

let currentSession = null; // { token, user: { email, name, companyName, customerId, identity }, profileComplete } | null

// Also the demo session boundary: a change of account (or a sign-out) clears every session-only demo store, so
// nothing one person did in demo mode shows for the next (services/mock/demoSession.js).
export function setCurrentSession(session) {
  const previous = currentSession;
  currentSession = session;
  demoSessionChanged(previous, session);
}

export function getCurrentSession() {
  return currentSession;
}

// Only a REAL provider's token is sent to MAZ. While auth is mock the token is made up, so nothing is sent.
setAuthTokenProvider(() => (AUTH_IS_MOCK ? null : (currentSession?.token ?? null)));

// MAZ answered 401 (session expired / revoked): AuthContext registers what to do (sign out).
export function onSessionExpired(handler) {
  setUnauthorizedHandler(handler);
}
