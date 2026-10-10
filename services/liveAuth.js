// ⚠️ LIVE CUSTOMER DATA — AUTHENTICATION CHECK. The ONLY thing that can make a session "live" (allowed to load MAZ's live
// customer data through services/httpApi.js — see services/customerService.js customerDataSource).
//
// MAZ has no authentication yet, so NO session is a verified live session: this always answers false, and live
// customer-specific requests are unavailable in the app. Nothing a session carries — an email, a customer id, an
// account-type label, a token string — and no configuration value (SERVICE_SOURCES) counts as proof.
//
// Going live: the real auth provider (services/mazAuth.js) replaces this with a check backed by MAZ itself, e.g. a
// session it created from a login MAZ accepted, re-confirmed with the server (GET /me) after a restore from storage.
// It must FAIL CLOSED: anything it can't confirm → false — and a verified session must not be editable afterwards (its
// customer id swapped while it still counts as verified), e.g. by freezing the sessions it issues.
//
// Tests replace this module with tests/fixtures/fakeLiveAuth.mjs through the Node test loader (tests/loader-hooks.mjs)
// to exercise the live API code. Metro never runs that loader, so the app always uses this file.
export function isVerifiedLiveSession() {
  return false;
}
