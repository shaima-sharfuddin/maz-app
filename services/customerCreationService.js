import { post } from "./httpClient";
import { toApiCustomer } from "./apiMappers";
import { customersEnabled } from "./serviceConfig";

// New User customer record → MAZ (POST /customers). OFF unless the bundler is started with EXPO_PUBLIC_SEND_CUSTOMERS=true
// (services/serviceConfig.js) — MAZ hasn't confirmed the request format; the body copies the existing records
// (apiMappers.toApiCustomer — no CPR / passport while GET /customers is public).
//
// submitSignUpCustomer(signUp) → { status: "recorded", customer } once MAZ answers 2xx (customer = its response record, or
// null) | { status: "disabled" } when switched off (no request). Rejects with ApiError (NETWORK, TIMEOUT, VALIDATION +
// error.fields, SERVER …) — "recorded" is never returned without MAZ's 2xx.
//
// The created record is NOT linked to the app login: there's no MAZ authentication, so the New User keeps no customer
// id and never loads customer data (services/customerService.js). Linking needs real auth (services/liveAuth.js).
//
// Duplicates: identical details are sent once per app run (in flight shared, success remembered), like the enquiry. A
// TIMEOUT is ambiguous (MAZ may have saved it) — retrying then can create a second record.

const recorded = new Map(); // details key → confirmed result
const inFlight = new Map(); // details key → pending request

export function areCustomersLive() {
  return customersEnabled();
}

export function submitSignUpCustomer(signUp) {
  if (!customersEnabled()) return Promise.resolve({ status: "disabled" });
  const payload = toApiCustomer(signUp);
  const key = JSON.stringify(payload);
  if (recorded.has(key)) return Promise.resolve({ ...recorded.get(key), duplicate: true });
  if (inFlight.has(key)) return inFlight.get(key);

  const request = post("/customers", payload)
    .then((body) => {
      const result = { status: "recorded", customer: body?.data ?? body ?? null };
      recorded.set(key, result);
      return result;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}
