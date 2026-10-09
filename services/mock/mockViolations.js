import { MOCK_VIOLATIONS } from "../../data/mockViolations";

// ⚠️ MOCK VIOLATION PROVIDER — DEMO data only. MAZ has no violations API.
// The notice TYPES are real ones from MAZ's admin panel (data/mockViolations.js), but these records, dates and
// wording are samples — they are NOT linked to the customer's real contracts (contractId: null) and every record
// carries demo: true so screens badge it "Demo data". Nothing is ever written anywhere.
//
// A real provider (e.g. services/mazViolations.js, GET /violations — customer-scoped) must return the same shape:
//   listViolations() → [violation]   getViolation(id) → violation | null
// violation = { id, title, contractId | null, unit | null, issuedOn, dueDate?, status "open" | "resolved",
//               description, fine | null, resolvedOn?, resolution?, demo }

const toDemoRecord = (violation) => ({
  ...violation,
  contractId: null, // sample notices aren't tied to any real MAZ contract
  unit: null,
  demo: true,
});

export function listViolations() {
  return MOCK_VIOLATIONS.map(toDemoRecord).sort((a, b) => b.issuedOn.localeCompare(a.issuedOn));
}

export function getViolation(id) {
  const violation = MOCK_VIOLATIONS.find((v) => v.id === id);
  return violation ? toDemoRecord(violation) : null;
}
