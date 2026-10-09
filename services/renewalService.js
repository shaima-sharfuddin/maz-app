import * as mockRenewals from "./mock/mockRenewals";
import { ApiError } from "./apiError";
import { fetchContract } from "./contractService";
import { recordNotificationEvent } from "./notificationService";
import { SERVICE_SOURCES } from "./serviceConfig";
import { getExpiryStatus, warningStartDate } from "./expiryService";
import { RENEWAL_TERM_OPTIONS, extendEndDate, formatTerm } from "../data/pricing";
import { formatDate } from "../utils/formatDate";

// Contract renewal REQUESTS — the ONLY renewal entry point for screens. A renewal is always a request for MAZ to
// review, never an automatic renewal, and the real MAZ contract is never changed. Contract data (end date, rate)
// comes from the REAL contracts (contractService).

// ⚠️ RENEWAL PROVIDER: MOCK (services/mock/mockRenewals.js) — MAZ has no renewal API. Requests live in memory for
// this session and are NOT sent to MAZ. Going live: services/mazRenewals.js with the same functions, switch this
// line, set SERVICE_SOURCES.renewals = "real", and drop advanceRenewalDemo.
const provider = mockRenewals;

export const RENEWALS_ARE_DEMO = SERVICE_SOURCES.renewals !== "real";
export { RENEWAL_TERM_OPTIONS };

// Labels for the renewal status tracker (Renewal Status screen).
export const RENEWAL_STEPS = [
  { key: "requested", label: "Request Submitted" },
  { key: "reviewing", label: "MAZ Review" },
  { key: "approved", label: "Decision" },
];

// The contract's renewal request, or null. Synchronous provider, async here to match a real API.
export async function fetchRenewal(contractId) {
  return provider.getRenewal(contractId);
}

// Can this contract's renewal be requested now? → { canRequest, reason, opensOn }
// Only an ACTIVE contract (MAZ status) inside the expiry warning window (client, 2026-10-08) — i.e. ending today or
// within getExpiryWarningDays() days (the confirmed 10-day rule) — with no request in progress.
// The window comes from expiryService (single source of truth). reason:
//   "already-requested" | "not-active" | "expired" (end date passed) | "no-end-date" | "outside-window" (opensOn =
//   the first day a request is possible, "YYYY-MM-DD")
export function renewalEligibility(contract, renewal) {
  if (renewal) return { canRequest: false, reason: "already-requested", opensOn: null };
  if (contract?.status !== "active") return { canRequest: false, reason: "not-active", opensOn: null };
  const expiry = getExpiryStatus(contract);
  if (expiry.state === "unknown") return { canRequest: false, reason: "no-end-date", opensOn: null };
  if (expiry.state === "expired") return { canRequest: false, reason: "expired", opensOn: null };
  if (expiry.state === "ok") return { canRequest: false, reason: "outside-window", opensOn: warningStartDate(expiry) };
  return { canRequest: true, reason: null, opensOn: null };
}

const ELIGIBILITY_ERRORS = {
  "already-requested": ["RENEWAL_PENDING", "A renewal request for this contract is already in progress."],
  "not-active": ["NOT_ACTIVE", "Only active contracts can be renewed."],
  expired: ["NOT_ACTIVE", "This contract has already ended."],
  "no-end-date": ["NO_END_DATE", "This contract has no end date to renew from."],
  "outside-window": ["RENEWAL_NOT_OPEN", "Renewal requests open closer to the contract's end date."],
};

// Submits a renewal request. payload: { termMonths, remark }. → renewal
export async function requestRenewal(contractId, { termMonths, remark = "" }) {
  const contract = await fetchContract(contractId); // REAL contract (read only)
  const existing = provider.getRenewal(contractId);
  const { canRequest, reason } = renewalEligibility(contract, existing);
  if (!canRequest) throw new ApiError(...ELIGIBILITY_ERRORS[reason]);
  if (!RENEWAL_TERM_OPTIONS.includes(termMonths)) throw new ApiError("INVALID_TERM", "Choose a renewal term.");

  const renewal = provider.createRenewal({
    contractId,
    termMonths,
    remark,
    currentEndDate: contract.endDate,
    proposedEndDate: extendEndDate(contract.endDate, termMonths),
  });
  recordNotificationEvent({
    type: "renewal",
    title: "Renewal request submitted",
    body: `${contract.id} · ${formatTerm(termMonths)} to ${formatDate(renewal.proposedEndDate)}. MAZ will review your request.`,
    target: { screen: "RenewalStatus", params: { contractId } },
  });
  return renewal;
}

// ⚠️ DEMO ONLY — stands in for MAZ moving the request on (Renewal Status "Demo mode" link).
export async function advanceRenewalDemo(contractId) {
  const before = provider.getRenewal(contractId);
  if (!before) throw new ApiError("NOT_FOUND", "Renewal request not found.");
  const renewal = provider.advanceRenewal(contractId);
  if (renewal.status !== before.status) {
    recordNotificationEvent({
      type: "renewal",
      title: renewal.status === "approved" ? "Renewal approved (demo)" : "Renewal under review",
      body:
        renewal.status === "approved"
          ? `${contractId}: demo approval — MAZ would now issue your renewed contract.`
          : `${contractId}: MAZ is reviewing your renewal request.`,
      target: { screen: "RenewalStatus", params: { contractId } },
    });
  }
  return renewal;
}
