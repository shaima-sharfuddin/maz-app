import * as mazAuth from "./mazAuth";
import { restoreSession as restoreVerifiedSession, withUserDetails as withVerifiedUserDetails } from "./liveAuth";
import { demoSessionChanged } from "./mock/demoSession";
import { setAuthTokenProvider, setUnauthorizedHandler } from "./http/apiClient";

// Authentication for the whole app: screens call logIn / logOut (via services/api.js), auth/AuthContext.js keeps this
// module told about the current session, and the data layer reads the session from here (the token for MAZ requests,
// the customer id via services/customerService.js).
//
// Provider: REAL MAZ login (services/mazAuth.js — POST /login, POST /logout). There is no mock login.

export const logIn = (credentials) => mazAuth.logIn(credentials);
export const logOut = () => mazAuth.logOut();

// A session read back from SecureStore → a verified session, or null (not a MAZ session — discard it).
export const restoreSession = (saved) => restoreVerifiedSession(saved);
// EditProfile / CompleteProfile: the same session with a new display name / company (token and customer id unchanged).
export const withUserDetails = (session, details) => withVerifiedUserDetails(session, details);

// ---- Current session (kept in sync by auth/AuthContext.js) -----------------------------------------------
// Set synchronously whenever the session changes, so a screen's first API call already sees it.

let currentSession = null; // { token, user: { email, name, companyName, customerId, identity }, profileComplete } | null

// Also the demo session boundary: a change of account (or a sign-out) clears every session-only demo store, so
// nothing one person did in a demo feature shows for the next (services/mock/demoSession.js).
export function setCurrentSession(session) {
  const previous = currentSession;
  currentSession = session;
  demoSessionChanged(previous, session);
}

export function getCurrentSession() {
  return currentSession;
}

// Every MAZ request carries the signed-in session's token as "Authorization: Bearer …" (services/http/apiClient.js).
setAuthTokenProvider(() => currentSession?.token ?? null);

// MAZ answered 401 (session expired / revoked): AuthContext registers what to do (sign out).
export function onSessionExpired(handler) {
  setUnauthorizedHandler(handler);
}
