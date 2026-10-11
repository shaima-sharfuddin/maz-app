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
  auth: "mock", // no login endpoint yet — services/mock/mockAuth.js
  // New User sign-up: the app LOGIN stays a LOCAL / DEMO account (mockApi.quickSignUp). The MAZ customer RECORD: REAL
  // POST /customers (services/customerCreationService.js) — but OFF unless the bundler is started with
  // EXPO_PUBLIC_SEND_CUSTOMERS=true (customersEnabled below). Its body is copied from the existing records, not a MAZ
  // spec (apiMappers.toApiCustomer). A created customer is NEVER linked to the login (no MAZ auth): the New User stays a
  // New User with no customer data.
  customerRegistration: "real",
  // New User ENQUIRY: REAL POST /enquiries (services/enquiryService.js) — but OFF unless the bundler is started with
  // EXPO_PUBLIC_SEND_ENQUIRIES=true (enquiriesEnabled below). The route exists (OPTIONS → Allow: GET,HEAD,POST) but MAZ
  // hasn't confirmed the request body / validation / response, so nothing is written to MAZ by default.
  enquiries: "real",
  customerIdentity: "mock", // nothing links a login to a MAZ customer yet — services/mock/mockCustomerIdentity.js
  // customer / contracts / bills: the REAL API code (httpApi.js) — used ONLY by a session VERIFIED by real MAZ
  // authentication (services/liveAuth.js; customerService.customerDataSource "live"). None exists yet, so no session can
  // load them — changing a value here doesn't change that. The demo tenant gets demoTenantData instead.
  customer: "real", // GET /customers/{id} — id + name only (the record's owner CPR / passport / contacts are never mapped)
  contracts: "real", // GET /contracts + GET /units (scoped to the customer ON THE PHONE — see httpApi.js)
  bills: "real", // contracts.receipts[]
  demoTenantData: "mock", // the mock demo tenant's SAMPLE contracts / bills / receipts — services/mock/mockTenantContracts.js
  billPaidStatus: "provisional", // paid = receipt_date set — unconfirmed (services/billService.js)
  paymentSummary: "provisional", // total / paid / balance / due calculated from the installments (paymentSummary.js)
  payments: "mock", // no MAZ payment API / gateway — services/mock/mockPayments.js (DEMO / TEST, session-only)
  expiryAlerts: "real", // CONFIRMED client rule (EXPIRY_WARNING_DAYS) applied in the app to the real contracts.to_date
  //                       (expiryService.js) — the alerts themselves are shown via the MOCK notifications below
  renewals: "mock", // no MAZ renewal API — services/mock/mockRenewals.js (requests in memory, never sent)
  notifications: "mock", // no MAZ notifications API — services/mock/mockNotifications.js (built in the app)
  emailDelivery: "none", // no MAZ email service — emails are only recorded as "not_sent"
  violations: "mock", // customer-specific violation NOTICES: no MAZ endpoint — services/mock/mockViolations.js ("Demo data")
  violationTypes: "real", // GET /violations — MAZ's catalogue of violation TYPES (not notices) — ViolationTypesScreen
  activities: "real", // GET /activities — sign-up Activity options; falls back to the SAMPLE list if it fails / is empty
  demoExpiringContract: "mock", // DEMO-RENEWAL-001 (services/mock/mockDemoContracts.js) — demo account + mock auth only
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

// The enquiry's `date`: today (local) by default. For the recruiter's initial test only, a fixed date can be given with
// EXPO_PUBLIC_ENQUIRY_TEST_DATE=2026-10-05 — never hardcoded here. Still unconfirmed: whether MAZ wants today's date
// or fills the date in itself (then drop the field in apiMappers.toApiEnquiry).
export function enquiryDate(today = new Date()) {
  const override = process.env.EXPO_PUBLIC_ENQUIRY_TEST_DATE;
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) return override;
  return toISODate(today);
}
