import * as mockAuth from "./mock/mockAuth";
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

// ---- Current session (kept in sync by auth/AuthContext.js) -----------------------------------------------
// Set synchronously whenever the session changes, so a screen's first API call already sees it.

let currentSession = null; // { token, user: { email, name, companyName, customerId }, profileComplete } | null

export function setCurrentSession(session) {
  currentSession = session;
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
