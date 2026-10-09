import { mockSignUpProfile } from "../mockApi";

// ⚠️ MOCK CUSTOMER IDENTITY — the ONLY place the app decides which MAZ customer a login belongs to.
//
// MAZ has no authentication yet, so nothing links an email to a customer record. Until it does, every demo
// Existing User login is treated as customer 1 (a real record in MAZ's database — so the contracts and bills
// shown are real, but they are NOT necessarily the logged-in person's). Screens label this "Demo account".
//
// Replace: the real login response (or GET /me) will return the customer id; the real auth provider puts it
// on the session and this file is deleted.
const DEMO_TENANT_CUSTOMER_ID = 1;

// Customer id for a demo login, or null when the account has no MAZ customer — a New User who signed up in
// this session (they haven't leased anything yet, so they get the New User dashboard).
export function customerIdForDemoLogin(user) {
  if (mockSignUpProfile(user.email)) return null;
  return DEMO_TENANT_CUSTOMER_ID;
}

// True when a customer id is the MOCK demo customer above — lets other demo providers (e.g. the demo expiring
// contract, services/mock/mockDemoContracts.js) attach only to the demo account, without repeating the id.
export function isDemoTenantCustomer(customerId) {
  return customerId === DEMO_TENANT_CUSTOMER_ID;
}
