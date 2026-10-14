// ⚠️ LIVE CUSTOMER DATA — AUTHENTICATION CHECK. The ONLY thing that can make a session "live" (allowed to load MAZ's
// customer data through services/httpApi.js — see services/customerService.js customerDataSource).
//
// A session counts as verified only if THIS module issued it — the exact session object (a WeakSet):
//   issueSession   — a login MAZ accepted (services/mazAuth.js)
//   restoreSession — the session saved by auth/AuthContext.js (SecureStore, encrypted, written only by the app). MAZ has
//                    no GET /me to re-check it; a revoked or expired token is caught by the first 401, which signs out.
// Issued sessions are FROZEN, so they can't be edited (e.g. the customer id swapped) while still counting as verified;
// a copied, edited or hand-built session is never verified. withUserDetails is the one allowed change.

export const MAZ_IDENTITY = "maz";

const issued = new WeakSet();

function freeze(session) {
  Object.freeze(session.user);
  Object.freeze(session);
  issued.add(session);
  return session;
}

const isText = (value) => typeof value === "string" && value.trim() !== "";

// True for a session this module issued (fails closed: anything else → false).
export function isVerifiedLiveSession(session) {
  return Boolean(session) && typeof session === "object" && issued.has(session);
}

// session = { token, user: { …, identity: MAZ_IDENTITY }, profileComplete } from a successful MAZ login.
export function issueSession(session) {
  return freeze({ ...session, user: { ...session.user } });
}

// A saved session (parsed JSON) → a verified session, or null when it isn't a MAZ session (e.g. an old demo session).
export function restoreSession(saved) {
  if (!saved || typeof saved !== "object" || !isText(saved.token)) return null;
  const user = saved.user;
  if (!user || typeof user !== "object" || user.identity !== MAZ_IDENTITY || !isText(user.email)) return null;
  if (!("customerId" in user)) return null;
  return freeze({ token: saved.token, user: { ...user }, profileComplete: saved.profileComplete !== false });
}

// EditProfile / CompleteProfile: a new verified session with only the display name / company (and profileComplete)
// changed — never the token or customer id.
export function withUserDetails(session, { name, companyName, profileComplete }) {
  if (!isVerifiedLiveSession(session)) return session;
  return freeze({
    ...session,
    profileComplete: profileComplete ?? session.profileComplete,
    user: { ...session.user, name: name || session.user.name, companyName: companyName || session.user.companyName },
  });
}
