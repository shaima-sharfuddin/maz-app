import * as mockViolations from "./mock/mockViolations";
import { ApiError } from "./apiError";
import { getCurrentCustomerId } from "./customerService";
import { SERVICE_SOURCES } from "./serviceConfig";

// Violations / compliance notices for the logged-in customer — the ONLY violations entry point for screens.

// ⚠️ VIOLATIONS PROVIDER: MOCK (services/mock/mockViolations.js) — MAZ has no violations API. Every record is demo
// data (demo: true) and screens label it "Demo data". Going live: services/mazViolations.js (customer-scoped
// GET /violations) with the same functions, switch this line, set SERVICE_SOURCES.violations = "real".
const provider = mockViolations;

export const VIOLATIONS_ARE_DEMO = SERVICE_SOURCES.violations !== "real";
export const DEMO_DATA_LABEL = "Demo data";

// The customer's notices, newest first. No customer (signed out / a New User) → none — never another customer's.
export async function fetchViolations() {
  if (getCurrentCustomerId() == null) return [];
  return provider.listViolations();
}

export async function fetchViolation(violationId) {
  if (getCurrentCustomerId() == null) {
    throw new ApiError("NO_CUSTOMER", "Your account isn't linked to a MAZ customer record yet.");
  }
  const violation = provider.getViolation(violationId);
  if (!violation) throw new ApiError("NOT_FOUND", "Notice not found.");
  return violation;
}

export async function countOpenViolations() {
  return (await fetchViolations()).filter((violation) => violation.status === "open").length;
}
