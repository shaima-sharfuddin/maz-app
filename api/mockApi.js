import { SERVICES } from "../data/brand";

// MOCK DATA LAYER — no backend yet. Each function mirrors a future API call so screens
// already handle loading / empty / error states. Swap these bodies for real fetches later.
// Latency is simulated so loading skeletons are visible in demos; set to 0 to disable.
export const MOCK_LATENCY_MS = 600;

const delay = (value) => new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS));

export function fetchPlans() {
  return delay(SERVICES);
}

// New-user state: no active lease yet.
export function fetchDashboard() {
  return delay({ lease: null });
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
