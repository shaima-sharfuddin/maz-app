import * as mockViolations from "./mock/mockViolations";
import { ApiError } from "./apiError";
import { getCurrentCustomerId } from "./customerService";
import { SERVICE_SOURCES } from "./serviceConfig";
import { fetchViolationTypes as fetchViolationTypesFromMaz } from "./httpApi";

// Violations / compliance notices for the logged-in customer — the ONLY violations entry point for screens.
// Two separate things, never mixed:
//   • NOTICES (fetchViolations / fetchViolation / countOpenViolations) — issued to the customer. MOCK, "Demo data".
//   • TYPES (fetchViolationTypes) — MAZ's REAL catalogue of violation categories (GET /violations). Reference only:
//     no customer, contract, date, status or fine — ViolationTypesScreen shows it as such.

// ⚠️ NOTICES PROVIDER: MOCK (services/mock/mockViolations.js) — MAZ has no endpoint for issued notices. Every record is demo
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

// MAZ's violation types → [{ name, code, label }] ("#186 …" → code "186"), by code. Public, not customer data, so
// it needs no customer; REAL (SERVICE_SOURCES.violationTypes).
export const VIOLATION_TYPES_ARE_REAL = SERVICE_SOURCES.violationTypes === "real";
export function fetchViolationTypes() {
  return fetchViolationTypesFromMaz();
}

export async function countOpenViolations() {
  return (await fetchViolations()).filter((violation) => violation.status === "open").length;
}
