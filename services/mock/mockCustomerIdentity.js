import { isDemoNewUserAccount } from "../mockApi";

// ⚠️ MOCK CUSTOMER IDENTITY — the ONLY place the app decides which MAZ customer a login belongs to.
//
// MAZ has no authentication yet, so nothing links an email to a customer record. Until it does, every demo
// Existing User login is treated as customer 1 (a real record in MAZ's database — so the contracts and bills
// shown are real, but they are NOT necessarily the logged-in person's). Screens label this "Demo account".
//
// Replace: the real login response (or GET /me) will return the customer id; the real auth provider puts it
// on the session and this file is deleted.
const DEMO_TENANT_CUSTOMER_ID = 1;

// The identity a session carries (session.user.identity). services/customerService.js only lets a session load MAZ
// customer data when its identity may carry a customer — today only DEMO_TENANT_IDENTITY, and only while auth is mock.
// Sessions saved without an identity (before 2026-10-10) can't be trusted with a customer id and are discarded.
export const DEMO_TENANT_IDENTITY = "demoTenant";
export const NEW_USER_IDENTITY = "newUser";

// → { customerId, identity } for a demo login. A New User demo account (signed up in this app — this run, or before a
// restart: mockApi remembers those accounts) → no customer, ever. Everyone else → the demo tenant (MAZ's demo
// customer, labelled "Demo account" on the dashboard). Callers must first make sure the remembered accounts were
// read (mockApi.ensureDemoAccountsLoaded) — otherwise a remembered New User would look like everyone else.
export function identityForDemoLogin(user) {
  if (isDemoNewUserAccount(user.email)) return { customerId: null, identity: NEW_USER_IDENTITY };
  return { customerId: DEMO_TENANT_CUSTOMER_ID, identity: DEMO_TENANT_IDENTITY };
}

// True when a customer id is the MOCK demo customer above — lets other demo providers (e.g. the demo expiring
// contract, services/mock/mockDemoContracts.js) attach only to the demo account, without repeating the id.
export function isDemoTenantCustomer(customerId) {
  return customerId === DEMO_TENANT_CUSTOMER_ID;
}
