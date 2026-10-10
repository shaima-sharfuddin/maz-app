import { resetSessionMockData, setDemoAccount } from "../mockApi";
import { clearDemoPayments } from "./demoPaymentLedger";
import { clearPendingPayments } from "./mockPayments";
import { clearRenewals } from "./mockRenewals";
import { clearSessionNotifications } from "./mockNotifications";

// ⚠️ DEMO SESSION BOUNDARY — keeps one person's demo actions from showing for the next person on the same phone.
//
// Every demo Existing User login is MAZ's demo customer (services/mock/mockCustomerIdentity.js), and the mock stores
// live in memory for the whole app run, so without this a sign-out → another login would still see the previous
// person's "Paid (demo)" bills, renewal requests, notifications and read state, enquiries and bookings.
//
// services/authService.js calls demoSessionChanged on EVERY session change (sign-in, sign-out, restore at launch,
// expiry). When the signed-in ACCOUNT changes (or signs out), every session-only demo store is cleared. A profile edit
// (same account, new session object) changes nothing.
//
// Not cleared (account data, not session data): the demo accounts themselves and their profile edits, and each
// account's office requests — those are stored per account (mockApi requestsByAccount), so no other account sees them.
// Real MAZ data is never touched: only the app's own in-memory demo stores are reset.

// The account a session belongs to: its sign-in email, normalised. null when signed out.
export function accountKeyOf(session) {
  const email = session?.user?.email;
  return typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
}

export function clearDemoSessionState() {
  clearDemoPayments();
  clearPendingPayments();
  clearRenewals();
  clearSessionNotifications();
  resetSessionMockData();
}

// previous / next: sessions ({ token, user: { email, … } }) or null.
export function demoSessionChanged(previous, next) {
  const nextAccount = accountKeyOf(next);
  if (accountKeyOf(previous) !== nextAccount) clearDemoSessionState();
  setDemoAccount(nextAccount);
}
