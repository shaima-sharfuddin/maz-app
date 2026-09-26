import { SERVICES } from "../data/brand";
import { MOCK_CONTRACTS, MOCK_TENANT_NAME } from "../data/mockTenant";

// MOCK DATA LAYER — no backend yet. Each function mirrors a future API call so screens
// already handle loading / empty / error states. Swap these bodies for real fetches later.
// Latency is simulated so loading skeletons are visible in demos; set to 0 to disable.
export const MOCK_LATENCY_MS = 600;

const delay = (value) => new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS));

export function fetchPlans() {
  return delay(SERVICES);
}

// userState comes from the Settings demo toggle (demo/DemoContext.js):
// "newUser" → no lease yet; "tenant" → contracts overview. The real API will decide this itself.
export function fetchDashboard(userState = "tenant") {
  if (userState === "newUser") return delay({ lease: null });

  const active = MOCK_CONTRACTS.filter((c) => c.status === "active");
  const expired = MOCK_CONTRACTS.filter((c) => c.status === "expired");
  const withDues = MOCK_CONTRACTS.filter((c) => c.outstanding > 0);
  const countOf = (type) => active.filter((c) => c.type === type).length;

  return delay({
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
    contracts: MOCK_CONTRACTS,
  });
}

export function fetchContract(contractId) {
  const contract = MOCK_CONTRACTS.find((c) => c.id === contractId);
  return contract
    ? delay(contract)
    : new Promise((_, reject) => setTimeout(() => reject(new Error("Contract not found")), MOCK_LATENCY_MS));
}

// In-memory stand-in for the backend's request store (cleared on app reload).
const submittedRequests = new Map();

// payload: { fullName, email, companyName, activity, remark, summary }
export function submitRequest(payload) {
  const requestId = `REQ-${Date.now().toString().slice(-6)}`;
  submittedRequests.set(requestId, payload);
  return delay({ requestId });
}

// The real API will return the request's actual stage; the mock always reports step 1
// ("Request Submitted"). currentStep is 1-based and indexes REQUEST_STEPS.
export function fetchRequestStatus(requestId) {
  const request = submittedRequests.get(requestId);
  return delay({ requestId, currentStep: 1, summary: request?.summary ?? null });
}
