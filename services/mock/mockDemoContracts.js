import { SERVICE_SOURCES } from "../serviceConfig";
import { toISODate } from "../../utils/formatDate";
import { isDemoTenantCustomer } from "./mockCustomerIdentity";

// ⚠️ DEMO-ONLY CONTRACT — for showing the renewal alert flow to the recruiter. NOT MAZ data.
// - Exists only in the app (never fetched from or sent to MAZ), only for the MOCK demo customer, and only while auth
//   is mock (SERVICE_SOURCES.auth) — with real MAZ login it never appears.
// - Its end date is RELATIVE: always DEMO_DAYS_LEFT days from today (start = one 12-month term before that), so the
//   demo never goes stale. The app's normal expiry / renewal logic is applied to it like any contract.
// - It has no bills, carries demo: true, and services/contractService.js keeps it out of the contract counts and
//   payment totals. Screens label it "Demo data".
// Remove this file (and its use in contractService) when demos no longer need it.

export const DEMO_CONTRACT_ID = "DEMO-RENEWAL-001";
const DEMO_DAYS_LEFT = 7; // inside the confirmed 10-day renewal window

function demoDates(today = new Date()) {
  const end = new Date(today);
  end.setDate(end.getDate() + DEMO_DAYS_LEFT);
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);
  start.setDate(start.getDate() + 1); // a 12-month term ending on `end`
  return { startDate: toISODate(start), endDate: toISODate(end) };
}

const demoAvailable = (customerId) => SERVICE_SOURCES.auth === "mock" && isDemoTenantCustomer(customerId);

// The demo contract in the same shape as a mapped MAZ contract (services/apiMappers.js toUiContract).
function buildDemoContract(customerId) {
  return {
    id: DEMO_CONTRACT_ID,
    apiId: null,
    customerId,
    unit: "Demo Office 101",
    location: null,
    type: "office",
    status: "active",
    statusLabel: "Active",
    statusColor: "success",
    apiStatus: null,
    ...demoDates(),
    monthlyRate: 250,
    numberOfMonths: 12,
    installmentsPerYear: "4",
    paymentFrequency: "Quarterly",
    deposit: 250,
    bills: [], // no bills — keeps it out of every payment figure
    bill: null,
    payment: null,
    outstanding: null,
    dueDate: null,
    paidThrough: null,
    renewal: null,
    demo: true,
  };
}

// [demo contract] for the demo customer, else [].
export function listDemoContracts(customerId) {
  return demoAvailable(customerId) ? [buildDemoContract(customerId)] : [];
}

// The demo contract by id, or null (not demo / not the demo customer).
export function getDemoContract(contractId, customerId) {
  return contractId === DEMO_CONTRACT_ID && demoAvailable(customerId) ? buildDemoContract(customerId) : null;
}
