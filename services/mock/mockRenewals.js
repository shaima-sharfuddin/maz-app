import { toISODate } from "../../utils/formatDate";

// ⚠️ MOCK RENEWAL PROVIDER — DEMO only. MAZ has no renewal API.
// - Renewal REQUESTS are kept in memory for this app session (gone after a reload / restart).
// - Nothing is sent to MAZ (no network request) and the real MAZ contract is never changed — a renewal is always a
//   request for MAZ to review, never an automatic renewal.
// - Stages: "requested" (submitted) → "reviewing" (MAZ review) → "approved" (decision). Only the demo control on
//   Renewal Status moves a request on (services/renewalService.advanceRenewalDemo).
//
// A real provider (e.g. services/mazRenewals.js) must export the same functions and shapes:
//   getRenewal(contractId) → renewal | null        listRenewals() → [renewal]
//   createRenewal({ contractId, termMonths, remark, currentEndDate, proposedEndDate }) → renewal
// renewal = { id, contractId, status, termMonths, remark, requestedOn, currentEndDate, proposedEndDate, updatedOn, demo }

export const RENEWAL_STAGES = ["requested", "reviewing", "approved"];

const renewals = new Map(); // contractId → renewal
const copy = (renewal) => (renewal ? { ...renewal } : null);

export function getRenewal(contractId) {
  return copy(renewals.get(contractId));
}

export function listRenewals() {
  return [...renewals.values()].map(copy);
}

export function createRenewal({ contractId, termMonths, remark, currentEndDate, proposedEndDate }) {
  const today = toISODate(new Date());
  const renewal = {
    id: `DEMO-RNW-${Date.now().toString().slice(-6)}`,
    contractId,
    status: "requested",
    termMonths,
    remark: remark?.trim() ?? "",
    requestedOn: today,
    updatedOn: today,
    currentEndDate,
    proposedEndDate,
    demo: true,
  };
  renewals.set(contractId, renewal);
  return copy(renewal);
}

// DEMO ONLY — stands in for MAZ reviewing the request.
export function advanceRenewal(contractId) {
  const renewal = renewals.get(contractId);
  if (!renewal) return null;
  const next = RENEWAL_STAGES[RENEWAL_STAGES.indexOf(renewal.status) + 1];
  if (!next) return copy(renewal);
  renewal.status = next;
  renewal.updatedOn = toISODate(new Date());
  return copy(renewal);
}
