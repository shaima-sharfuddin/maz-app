import { fetchCustomerContracts, fetchContract as fetchContractFromMaz, fetchCustomer } from "./httpApi";
import { mockTenantActivity } from "./mockApi";
import { withPaymentStatus } from "./billService";
import { requireCurrentCustomerId, customerDataSource } from "./customerService";
import { listDemoTenantContracts, getDemoTenantContract } from "./mock/mockTenantContracts";
import { ApiError } from "./apiError";
import { summarizePayments, contractsForAccountPayments } from "./paymentSummary";
import { getExpiryStatus } from "./expiryService";
import { countOpenViolations } from "./violationService";

// Contracts for the logged-in customer, from the session's customer data source (services/customerService.js):
//   "live" — REAL MAZ data (GET /contracts + GET /units, scoped to the session's customer in services/httpApi.js);
//   "demo" — the MOCK demo tenant's SAMPLE contracts (services/mock/mockTenantContracts.js) — never MAZ's live data.
// Bills get their (provisional / demo) paid status from services/billService.js either way.

// Bills get their (provisional / demo) paid status; the contract gets `expiry` (expiryService — confirmed 10-day
// window, worked out from the real end date, which is left as it is).
const withBillStatuses = (contract) => ({
  ...contract,
  bills: contract.bills.map(withPaymentStatus),
  expiry: getExpiryStatus(contract),
});

// Every contract of the logged-in customer (Contract List). Live: the MAZ download, shared / briefly cached in
// services/httpApi.js; { withUnits: false } doesn't wait for the unit list (unit names null) — for the dashboard's
// first paint. Demo: the sample contracts, in the app (no network request). No customer → NO_CUSTOMER.
export async function fetchContracts({ withUnits = true } = {}) {
  const customerId = requireCurrentCustomerId();
  if (customerDataSource() === "demo") return listDemoTenantContracts(customerId).map(withBillStatuses);
  return (await fetchCustomerContracts({ withUnits })).map(withBillStatuses);
}

// One contract by its number, e.g. "CN-2026-00001" (Contract Details, Payment) — from the same source as above.
export async function fetchContract(contractId) {
  const customerId = requireCurrentCustomerId();
  if (customerDataSource() === "demo") {
    const demo = getDemoTenantContract(contractId, customerId);
    if (!demo) throw new ApiError("NOT_FOUND", "Contract not found.");
    return withBillStatuses(demo);
  }
  return withBillStatuses(await fetchContractFromMaz(contractId));
}

// The dashboard's "Contract expiring soon" alert: ACTIVE contracts with 10 days or fewer left (the confirmed rule —
// expiryService "expiring", which includes the end date itself), soonest first. Expired contracts never appear.
// Each entry names its contract and the screen a tap opens (Contract Details, where Renew contract lives).
export function expiringSoon(contracts) {
  return contracts
    .filter((contract) => contract.status === "active" && contract.expiry?.state === "expiring")
    .sort((a, b) => a.expiry.daysLeft - b.expiry.daysLeft)
    .map((contract) => ({
      contractId: contract.id,
      demo: Boolean(contract.demo), // the DEMO expiring contract (mockDemoContracts) — labelled on screen
      unit: contract.unit,
      endDate: contract.expiry.endDate,
      daysLeft: contract.expiry.daysLeft,
      target: { screen: "ContractDetail", params: { contractId: contract.id } },
    }));
}

// Counts for the dashboard's Contracts card (total / active / expired only). Status comes from MAZ's own contract
// status enum. Every contract of the session's source counts (the demo tenant's are all sample contracts).
export function summarizeContracts(contracts) {
  const active = contracts.filter((c) => c.status === "active");
  const expired = contracts.filter((c) => c.status === "expired");
  return {
    totalCount: contracts.length,
    activeCount: active.length,
    expiredCount: expired.length,
    latestExpiry: expired.map((c) => c.endDate).filter(Boolean).sort().slice(-1)[0] ?? null,
  };
}

// A contract's money figures for Contract Details. The first four are MAZ fields as-is (null = not provided).
// The totals are CALCULATED here from the installments (receipts) — MAZ's own rent_total isn't used because
// its meaning (VAT? deposit?) is unconfirmed; screens label these "calculated from installments".
export function contractAmounts(contract) {
  const bills = contract.bills ?? [];
  const sum = (key) => bills.reduce((total, bill) => total + (bill[key] ?? 0), 0);
  return {
    monthlyRate: contract.monthlyRate ?? null,
    numberOfMonths: contract.numberOfMonths ?? null,
    paymentFrequency: contract.paymentFrequency ?? null,
    deposit: contract.deposit ?? null,
    installmentCount: bills.length,
    rentFromInstallments: bills.length ? sum("rent") : null,
    vatFromInstallments: bills.length ? sum("vat") : null,
    totalFromInstallments: bills.length ? sum("amount") : null,
  };
}

// The Existing User dashboard's contract data: { summary, payment, expiringSoon, contracts }. The New User dashboard
// (demo toggle "newUser") has no contracts. `payment` = summarizePayments of the ACTIVE contracts (PROVISIONAL —
// calculated from the installments). Progressive loading: the dashboard asks first with { withUnits: false } (counts,
// payment — no unit names needed) and again with units to fill in unit names; both share one /contracts download.
// It no longer waits for the customer record (fetchTenantName) or the activity figures (fetchDashboardActivity).
export async function fetchDashboard(userState = "tenant", { withUnits = true } = {}) {
  if (userState === "newUser") return { lease: null }; // demo toggle — see demo/DemoContext.js

  requireCurrentCustomerId();
  const contracts = await fetchContracts({ withUnits });
  return {
    summary: summarizeContracts(contracts),
    payment: summarizePayments(contractsForAccountPayments(contracts)),
    expiringSoon: expiringSoon(contracts),
    contracts,
  };
}

// The dashboard Quick actions' captions — no network. ⚠️ MOCK: open enquiries / next booking (mockTenantActivity)
// and open violations (violationService — demo data). null for the New User dashboard.
export async function fetchDashboardActivity(userState = "tenant") {
  if (userState === "newUser") return null;
  return { ...mockTenantActivity(), openViolations: await countOpenViolations() };
}

// The customer record's name — the dashboard's fallback when the session has no name (REAL GET /customers/{id}).
// Loaded alongside, never blocking the dashboard. The demo tenant has no MAZ record to read → null (session name).
export async function fetchTenantName() {
  const customerId = requireCurrentCustomerId();
  if (customerDataSource() === "demo") return null;
  const customer = await fetchCustomer(customerId);
  return customer.name;
}
