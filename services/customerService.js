import { ApiError } from "./apiError";
import { getCurrentSession } from "./authService";
import { isVerifiedLiveSession } from "./liveAuth";

// Which MAZ customer the logged-in user is, and whether that customer's data may be loaded. Every customer-specific
// read (contracts, bills, receipts, the customer record) goes through here — never a constant.
//
// customerDataSource:
//   "live" — a session issued by the MAZ login (services/liveAuth.js isVerifiedLiveSession) whose login carries a
//            customer id: MAZ's API (services/httpApi.js).
//   null   — no customer: signed out, a MAZ login with customer_id null (a New User), or a session that wasn't issued
//            by the MAZ login (copied, edited or hand-built) — no customer data at all.

function customerDataSourceOf(session) {
  if (session?.user?.customerId != null && isVerifiedLiveSession(session) === true) return "live";
  return null;
}

// "live" | null for the signed-in session.
export function customerDataSource() {
  return customerDataSourceOf(getCurrentSession());
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

// For services/httpApi.js: the customer id of a verified MAZ session — NO_CUSTOMER before any request otherwise.
export function requireLiveCustomerId() {
  if (customerDataSource() !== "live") throw noCustomer();
  return getCurrentSession().user.customerId;
}

// Which dashboard (and which per-account-type mock data) a signed-in user gets — decided by the SESSION's customer id:
// a customer → "tenant" (contracts dashboard); none → "newUser". auth/AuthContext.js useAccountState() is the screens'
// way to read it. (Loading the data still needs the verified session — requireLiveCustomerId.)
export function accountStateOf(user) {
  return user?.customerId != null ? "tenant" : "newUser";
}
