import { toISODate } from "../utils/formatDate";

// Where each Existing User area gets its data — the one place to look before replacing a mock with a real
// MAZ API. Screens never read this; services do.
//
//   "real"        — a real, confirmed MAZ endpoint (services/httpApi.js)
//   "mock"        — a demo provider in services/mock/ (no MAZ endpoint exists yet)
//   "provisional" — real MAZ data, but one rule on top of it is unconfirmed (see the note)
//
// To go live with an area: write a provider with the same function names (e.g. services/mazAuth.js), switch
// that service's provider line, then update the entry here and CLAUDE.md. Screens don't change.
// FROZEN: read-only at runtime. It documents where data comes from; it never grants access — in particular live
// customer data needs a session verified by services/liveAuth.js, whatever `auth` says here.
export const SERVICE_SOURCES = Object.freeze({
  auth: "real", // POST /login + POST /logout — services/mazAuth.js (Bearer token on every request)
  registration: "real", // New User sign-up creates the MAZ LOGIN: POST /register — services/registerService.js (always on)
  // The rest of sign-up is LOCAL / DEMO (mockApi.quickSignUp). The MAZ customer RECORD: REAL
  // POST /customers (services/customerCreationService.js) — but OFF unless the bundler is started with
  // EXPO_PUBLIC_SEND_CUSTOMERS=true (customersEnabled below). Its body is copied from the existing records, not a MAZ
  // spec (apiMappers.toApiCustomer). A created customer isn't linked to any login by the app.
  customerRegistration: "real",
  // New User ENQUIRY: REAL POST /enquiries (services/enquiryService.js) — but OFF unless the bundler is started with
  // EXPO_PUBLIC_SEND_ENQUIRIES=true (enquiriesEnabled below). The route exists (OPTIONS → Allow: GET,HEAD,POST) but MAZ
  // hasn't confirmed the request body / validation / response, so nothing is written to MAZ by default.
  enquiries: "real",
  customerIdentity: "real", // the login's user.customer_id (null → New User) — apiMappers.toUiAuthSession
  // customer / contracts / bills: the REAL API (httpApi.js) — only for a session issued by the MAZ login with a customer
  // id (services/liveAuth.js; customerService.customerDataSource "live"). Changing a value here doesn't grant access.
  customer: "real", // GET /customers/{id} — id + name only (the record's owner CPR / passport / contacts are never mapped)
  contracts: "real", // GET /contracts + GET /units (scoped to the customer ON THE PHONE — see httpApi.js)
  bills: "real", // contracts.receipts[]
  billPaidStatus: "provisional", // paid = receipt_date set — unconfirmed (services/billService.js)
  paymentSummary: "provisional", // total / paid / balance / due calculated from the installments (paymentSummary.js)
  // Payments: REAL Tap gateway (POST /tap/create-charge — services/tapPayments.js), ON by default (user decision,
  // 2026-10-20). EXPO_PUBLIC_TAP_PAYMENTS=false falls back to the DEMO provider (services/mock/mockPayments.js).
  // ⚠️ Known gaps: the paid / unpaid rule is still provisional (a charge could ask for a bill MAZ has already been
  // paid), and MAZ has no endpoint to confirm a charge's result — the app never shows a live payment as "paid".
  payments: "real",
  expiryAlerts: "real", // CONFIRMED client rule (EXPIRY_WARNING_DAYS) applied in the app to the real contracts.to_date
  //                       (expiryService.js) — the alerts themselves are shown via the MOCK notifications below
  renewals: "mock", // no MAZ renewal API — services/mock/mockRenewals.js (requests in memory, never sent)
  notifications: "mock", // no MAZ notifications API — services/mock/mockNotifications.js (built in the app)
  emailDelivery: "none", // no MAZ email service for notifications — those emails are only recorded as "not_sent"
  emailVerification: "real", // New User sign-up code: MAZ emails it (POST /sendotp) and checks it (POST /verifyotp)
  violations: "mock", // customer-specific violation NOTICES: no MAZ endpoint — services/mock/mockViolations.js ("Demo data")
  violationTypes: "real", // GET /violations — MAZ's catalogue of violation TYPES (not notices) — ViolationTypesScreen
  activities: "real", // GET /activities (needs a login) — sign-up Activity options; SAMPLE list if it fails / 401s / is empty
});

// CONFIRMED business rule (client, 2026-10-08): an ACTIVE contract shows the expiry / renewal alert and can request a
// renewal ONLY when it has this many days or fewer left before its end date (contracts.to_date). The contract's length
// doesn't matter — only the days remaining. Expired contracts can't request a renewal.
export const EXPIRY_WARNING_DAYS = 10;

// POST /enquiries switch (build-time, like EXPO_PUBLIC_SHOW_DEMO_CONTROLS): only `EXPO_PUBLIC_SEND_ENQUIRIES=true` sends the
// New User enquiry to MAZ. Read at call time so tests can flip it.
export function enquiriesEnabled() {
  return process.env.EXPO_PUBLIC_SEND_ENQUIRIES === "true";
}

// POST /customers switch: only `EXPO_PUBLIC_SEND_CUSTOMERS=true` sends the New User's customer record to MAZ. Read at call
// time so tests can flip it.
export function customersEnabled() {
  return process.env.EXPO_PUBLIC_SEND_CUSTOMERS === "true";
}

// Tap payments switch: Payment Review opens a REAL Tap checkout (real money) unless the bundler is started with
// EXPO_PUBLIC_TAP_PAYMENTS=false (demo payments). Read at call time so tests can flip it.
export function tapPaymentsEnabled() {
  return process.env.EXPO_PUBLIC_TAP_PAYMENTS !== "false";
}

// The enquiry's `date`: today (local) by default. For the recruiter's initial test only, a fixed date can be given with
// EXPO_PUBLIC_ENQUIRY_TEST_DATE=2026-10-05 — never hardcoded here. Still unconfirmed: whether MAZ wants today's date
// or fills the date in itself (then drop the field in apiMappers.toApiEnquiry).
export function enquiryDate(today = new Date()) {
  const override = process.env.EXPO_PUBLIC_ENQUIRY_TEST_DATE;
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) return override;
  return toISODate(today);
}
