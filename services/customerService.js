import { ApiError } from "./apiError";
import { getCurrentSession, isDemoNewUserEmail } from "./authService";
import { SERVICE_SOURCES } from "./serviceConfig";
import { DEMO_TENANT_IDENTITY } from "./mock/mockCustomerIdentity";
import { isVerifiedLiveSession } from "./liveAuth";

// Which MAZ customer the logged-in user is, and WHERE that customer's data may come from. Every customer-specific
// read (contracts, bills, receipts, the customer record) goes through here — never a constant.
//
// customerDataSource:
//   "demo" — the MOCK demo tenant (auth is mock, identity DEMO_TENANT_IDENTITY): SAMPLE data only
//            (services/mock/mockTenantContracts.js). A mock login can't prove whose data it may see, so it NEVER
//            loads MAZ's live customer data.
//   "live" — a session VERIFIED by a genuine authentication mechanism (services/liveAuth.js isVerifiedLiveSession):
//            MAZ's API (services/httpApi.js). FAILS CLOSED and is unreachable in the app today — no real MAZ
//            authentication exists, so liveAuth verifies nothing. The live API code is kept for going live.
//            No configuration value (SERVICE_SOURCES is frozen anyway), email, customer id, account-type label or
//            hand-built session can make a session live — only the verifier.
//   null   — no customer: signed out, a New User, or a session whose identity can't be trusted (e.g. saved before
//            identities existed) — no customer data at all, from anywhere.

// "demo" | null from what a session's user record says. Never "live": that needs the session itself verified.
function demoSourceOf(user) {
  if (user?.customerId == null) return null;
  if (isDemoNewUserEmail(user.email)) return null; // a New User demo account never has a customer
  if (SERVICE_SOURCES.auth === "mock" && user.identity === DEMO_TENANT_IDENTITY) return "demo";
  return null;
}

function customerDataSourceOf(session) {
  if (session?.user?.customerId != null && isVerifiedLiveSession(session) === true) return "live";
  return demoSourceOf(session?.user);
}

// "demo" | "live" | null for the signed-in session.
export function customerDataSource() {
  return customerDataSourceOf(getCurrentSession());
}

// True when this SAVED user record may have a customer (AuthContext's check on a restored session, accountStateOf).
// Only the demo tenant can pass from a user record alone — a live session must also be verified (customerDataSource).
export function hasSafeCustomerIdentity(user) {
  return demoSourceOf(user) != null;
}

// The customer id, or null (signed out, no customer yet — a New User — or a session that can't be trusted with one).
export function getCurrentCustomerId() {
  const session = getCurrentSession();
  return customerDataSourceOf(session) != null ? session.user.customerId : null;
}

const noCustomer = () => new ApiError("NO_CUSTOMER", "Your account isn't linked to a MAZ customer record yet.");

// The customer id, or a NO_CUSTOMER error for calls that only make sense for a customer (contracts, bills).
export function requireCurrentCustomerId() {
  const customerId = getCurrentCustomerId();
  if (customerId == null) throw noCustomer();
  return customerId;
}

// For services/httpApi.js ONLY: the customer id of a VERIFIED live session (services/liveAuth.js). Anything else — the
// mock demo tenant, a New User, an old, forged or hand-built session, any configuration — gets NO_CUSTOMER before any
// request is made. In the app today that's every session.
export function requireLiveCustomerId() {
  if (customerDataSource() !== "live") throw noCustomer();
  return getCurrentSession().user.customerId;
}

// Which dashboard (and which per-account-type mock data) a signed-in user gets — decided by the SESSION, never by a
// separate setting that could disagree with it: a customer → "tenant" (contracts dashboard); anything else → "newUser"
// (no customer data). auth/AuthContext.js useAccountState() is the screens' way to read it (it only has the user record;
// a verified live session — none exist yet — would pass the session to customerDataSource instead).
export function accountStateOf(user) {
  return hasSafeCustomerIdentity(user) ? "tenant" : "newUser";
}
