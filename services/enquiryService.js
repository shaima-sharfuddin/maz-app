import { post } from "./http/apiClient";
import { toApiEnquiry } from "./apiMappers";
import { enquiriesEnabled, enquiryDate } from "./serviceConfig";

// New User enquiry → MAZ (POST /enquiries). The ONLY write to MAZ in the app, and OFF unless the bundler is started
// with EXPO_PUBLIC_SEND_ENQUIRIES=true (services/serviceConfig.js) — MAZ hasn't confirmed the request format yet.
//
// submitSignUpEnquiry(signUp) → { status: "recorded", enquiry } once MAZ answers 2xx (enquiry = its response record,
// or null if it sent none) | { status: "disabled" } when switched off (no request). Rejects with ApiError (NETWORK,
// TIMEOUT, VALIDATION + error.fields, SERVER …) — "recorded" is never returned without MAZ's 2xx.
//
// Duplicates: identical details are sent once per app run — a second call while the first is in flight shares it,
// and a call after a confirmed success returns that success ({ duplicate: true }) without posting again. A TIMEOUT
// is ambiguous (MAZ may have saved it); retrying then can create a second record, so the screen says so.

const recorded = new Map(); // details key → confirmed result
const inFlight = new Map(); // details key → pending request

// The date is left out of the key so a retry after midnight still counts as the same enquiry.
const detailsKey = ({ date, ...details }) => JSON.stringify(details);

export function areEnquiriesLive() {
  return enquiriesEnabled();
}

export function submitSignUpEnquiry(signUp) {
  if (!enquiriesEnabled()) return Promise.resolve({ status: "disabled" });
  const payload = toApiEnquiry(signUp, { date: enquiryDate() });
  const key = detailsKey(payload);
  if (recorded.has(key)) return Promise.resolve({ ...recorded.get(key), duplicate: true });
  if (inFlight.has(key)) return inFlight.get(key);

  const request = post("/enquiries", payload)
    .then((body) => {
      const result = { status: "recorded", enquiry: body?.data ?? body ?? null };
      recorded.set(key, result);
      return result;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}
