// Where each Existing User area gets its data — the one place to look before replacing a mock with a real
// MAZ API. Screens never read this; services do.
//
//   "real"        — a real, confirmed MAZ endpoint (services/httpApi.js)
//   "mock"        — a demo provider in services/mock/ (no MAZ endpoint exists yet)
//   "provisional" — real MAZ data, but one rule on top of it is unconfirmed (see the note)
//
// To go live with an area: write a provider with the same function names (e.g. services/mazAuth.js), switch
// that service's provider line, then update the entry here and CLAUDE.md. Screens don't change.
export const SERVICE_SOURCES = {
  auth: "mock", // no login endpoint yet — services/mock/mockAuth.js
  customerIdentity: "mock", // nothing links a login to a MAZ customer yet — services/mock/mockCustomerIdentity.js
  customer: "real", // GET /customers/{id}
  contracts: "real", // GET /contracts + GET /units (scoped to the customer ON THE PHONE — see httpApi.js)
  bills: "real", // contracts.receipts[]
  billPaidStatus: "provisional", // paid = receipt_date set — unconfirmed (services/billService.js)
  paymentSummary: "provisional", // total / paid / balance / due calculated from the installments (paymentSummary.js)
  payments: "mock", // no MAZ payment API / gateway — services/mock/mockPayments.js (DEMO / TEST, session-only)
  expiryAlerts: "real", // CONFIRMED client rule (EXPIRY_WARNING_DAYS) applied in the app to the real contracts.to_date
  //                       (expiryService.js) — the alerts themselves are shown via the MOCK notifications below
  renewals: "mock", // no MAZ renewal API — services/mock/mockRenewals.js (requests in memory, never sent)
  notifications: "mock", // no MAZ notifications API — services/mock/mockNotifications.js (built in the app)
  emailDelivery: "none", // no MAZ email service — emails are only recorded as "not_sent"
  violations: "mock", // no MAZ violations API — services/mock/mockViolations.js (records labelled "Demo data")
  demoExpiringContract: "mock", // DEMO-RENEWAL-001 (services/mock/mockDemoContracts.js) — demo account + mock auth only
};

// CONFIRMED business rule (client, 2026-10-08): an ACTIVE contract shows the expiry / renewal alert and can request a
// renewal ONLY when it has this many days or fewer left before its end date (contracts.to_date). The contract's length
// doesn't matter — only the days remaining. Expired contracts can't request a renewal.
export const EXPIRY_WARNING_DAYS = 10;
