import { SERVICES } from "../data/brand";
import { MOCK_CONTRACTS, MOCK_TENANT_NAME } from "../data/mockTenant";
import { PAYMENT_METHODS } from "../data/paymentMethods";
import { ApiError } from "./apiError";

// MOCK API — no backend yet. Screens import these via services/api.js; each function has the
// same signature and result shape the real endpoint should have, so swapping is local to /services.
//
// Every call goes through simulate(): a random 800–1200 ms delay, then a random failure
// MOCK_FAILURE_RATE of the time (while enabled) so error states are exercised during development.
// The Settings → Demo data → "Simulate network errors" switch turns failures off for demos.

export const MOCK_FAILURE_RATE = 0.15;
const MIN_LATENCY_MS = 800;
const MAX_LATENCY_MS = 1200;

let failuresEnabled = true;
export function setMockFailuresEnabled(enabled) {
  failuresEnabled = enabled;
}

const RANDOM_FAILURES = [
  new ApiError("NETWORK", "We couldn't reach MAZ. Check your connection and try again."),
  new ApiError("TIMEOUT", "The request took too long. Please try again."),
  new ApiError("SERVER", "Something went wrong on our side. Please try again in a moment."),
];

// Waits, then (maybe) fails at random, then runs `produce`. The random failure is decided BEFORE
// produce() runs, so a failed call never changes mock data (e.g. a failed payment stays unpaid).
// produce() may itself throw an ApiError for rule-based errors (e.g. "Contract not found").
function simulate(produce, { canFail = true } = {}) {
  const latency = MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (canFail && failuresEnabled && Math.random() < MOCK_FAILURE_RATE) {
        const failure = RANDOM_FAILURES[Math.floor(Math.random() * RANDOM_FAILURES.length)];
        reject(new ApiError(failure.code, failure.message));
        return;
      }
      try {
        resolve(produce());
      } catch (error) {
        reject(error instanceof ApiError ? error : new ApiError("UNKNOWN", error?.message || "Something went wrong."));
      }
    }, latency);
  });
}

const clone = (value) => JSON.parse(JSON.stringify(value));
const newId = (prefix) => `${prefix}-${Date.now().toString().slice(-6)}`;

// Local calendar date (not toISOString, which is UTC and can be a day off in Bahrain, UTC+3).
const toISODate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

// Working copy of the tenant's contracts so a mock payment can update balances for the rest of the
// session (resets on app reload). Screens always receive copies, never the store itself.
const contracts = clone(MOCK_CONTRACTS);
// In-memory stand-in for the backend's request store (cleared on app reload).
const submittedRequests = new Map();

// ---- Auth & profile --------------------------------------------------------

// payload: { fullName, email, phone } → { userId, email }
export function signUp(payload) {
  return simulate(() => ({ userId: newId("USR"), email: payload.email }));
}

// payload: { email, password } → { token, user }
// Dev shortcut: the password "wrong" always fails with INVALID_CREDENTIALS, to test that error.
export function logIn(payload) {
  return simulate(() => {
    if (payload.password === "wrong") throw new ApiError("INVALID_CREDENTIALS", "Incorrect email or password.");
    return { token: newId("TKN"), user: { email: payload.email, name: MOCK_TENANT_NAME } };
  });
}

// email → { sent: true }
export function requestPasswordReset(email) {
  return simulate(() => ({ sent: true, email }));
}

// payload: { customer, owner } (the Create Customer form) → { customerId }
export function saveProfile() {
  return simulate(() => ({ customerId: newId("CUS") }));
}

// ---- Plans & requests ------------------------------------------------------

export function fetchPlans() {
  return simulate(() => clone(SERVICES));
}

// payload: { fullName, email, companyName, activity, remark, summary } → { requestId }
export function submitRequest(payload) {
  return simulate(() => {
    const requestId = newId("REQ");
    submittedRequests.set(requestId, clone(payload));
    return { requestId };
  });
}

// The real API will return the request's actual stage; the mock always reports step 1
// ("Request Submitted"). currentStep is 1-based and indexes REQUEST_STEPS.
export function fetchRequestStatus(requestId) {
  return simulate(() => {
    const request = submittedRequests.get(requestId);
    return { requestId, currentStep: 1, summary: request?.summary ?? null };
  });
}

// ---- Tenant: dashboard, contracts, payments --------------------------------

// userState comes from the Settings demo toggle (demo/DemoContext.js):
// "newUser" → no lease yet; "tenant" → contracts overview. The real API will decide this itself.
export function fetchDashboard(userState = "tenant") {
  return simulate(() => {
    if (userState === "newUser") return { lease: null };

    const active = contracts.filter((c) => c.status === "active");
    const expired = contracts.filter((c) => c.status === "expired");
    const withDues = contracts.filter((c) => c.outstanding > 0);
    const countOf = (type) => active.filter((c) => c.type === type).length;

    return {
      tenantName: MOCK_TENANT_NAME,
      summary: {
        activeCount: active.length,
        activeOffices: countOf("office"),
        activeIncubators: countOf("incubator"),
        expiredCount: expired.length,
        latestExpiry: expired.map((c) => c.endDate).sort().slice(-1)[0] ?? null,
        paymentDue: withDues.reduce((sum, c) => sum + c.outstanding, 0),
        nextDueDate: withDues.map((c) => c.dueDate).sort()[0] ?? null,
      },
      contracts: clone(contracts),
    };
  });
}

export function fetchContract(contractId) {
  return simulate(() => {
    const contract = contracts.find((c) => c.id === contractId);
    if (!contract) throw new ApiError("NOT_FOUND", "Contract not found.");
    return clone(contract);
  });
}

// ⚠️ MOCK PAYMENT — no gateway, nothing is charged. Settles the contract's outstanding balance:
// due bills become paid, the balance clears, and the payment details show this payment.
// The real version will hand off to the confirmed gateway (BenefitPay?) and return its result.
export function payOutstandingBalance(contractId, methodId) {
  return simulate(() => {
    const contract = contracts.find((c) => c.id === contractId);
    const method = PAYMENT_METHODS.find((m) => m.id === methodId);
    if (!contract) throw new ApiError("NOT_FOUND", "Contract not found.");
    if (!method) throw new ApiError("INVALID_METHOD", "Choose a payment method.");
    if (contract.outstanding <= 0) throw new ApiError("NOTHING_DUE", "Nothing to pay on this contract.");

    const now = new Date();
    const paidDate = toISODate(now);
    const receipt = `RCP-${paidDate.slice(0, 4)}-${paidDate.slice(5, 7)}${paidDate.slice(8, 10)}-${String(now.getTime()).slice(-4)}`;
    const amount = contract.outstanding;
    const paidBills = contract.bills.filter((bill) => bill.status === "due");

    paidBills.forEach((bill) => {
      bill.status = "paid";
    });
    contract.outstanding = 0;
    contract.dueDate = null;
    contract.payment = { method: method.label, lastAmount: amount, lastDate: paidDate, receipt };
    if (contract.bill) contract.paidThrough = contract.bill.periodEnd;

    return {
      receipt,
      amount,
      paidDate,
      method: method.label,
      contractId: contract.id,
      unit: `${contract.unit} · ${contract.location}`,
      bills: paidBills.map((bill) => bill.number),
    };
  });
}
