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
