import { ApiError } from "./apiError";
import { getCurrentSession } from "./authService";

// Which MAZ customer the logged-in user is. Every customer-specific request (contracts, bills, the customer
// record) gets its id from here — never from a constant.
//
// Today the id is put on the session by the MOCK auth provider (services/mock/mockCustomerIdentity.js).
// When MAZ adds authentication, the real login (or GET /me) supplies it and this file doesn't change.

// The customer id, or null (signed out, or an account with no MAZ customer yet — a New User).
export function getCurrentCustomerId() {
  return getCurrentSession()?.user?.customerId ?? null;
}

// The customer id, or a NO_CUSTOMER error for calls that only make sense for a customer (contracts, bills).
export function requireCurrentCustomerId() {
  const customerId = getCurrentCustomerId();
  if (customerId == null) {
    throw new ApiError("NO_CUSTOMER", "Your account isn't linked to a MAZ customer record yet.");
  }
  return customerId;
}
