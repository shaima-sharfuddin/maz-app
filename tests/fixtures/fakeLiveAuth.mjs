// TEST-ONLY stand-in for services/liveAuth.js, swapped in by tests/loader-hooks.mjs (Node test loader — never part of
// the app bundle). Plays the future REAL auth provider: a session counts as verified only if THIS module issued it —
// the exact session object (a WeakSet), so a copied, edited or hand-built session is never verified.
const issued = new WeakSet();

export function isVerifiedLiveSession(session) {
  return Boolean(session) && typeof session === "object" && issued.has(session);
}

// What a successful real login would do: mark the session it created as verified — and freeze it, so it can't be
// edited afterwards (e.g. its customer id swapped) while staying "verified".
export function issueVerifiedLiveSession(session) {
  Object.freeze(session.user);
  Object.freeze(session);
  issued.add(session);
  return session;
}
