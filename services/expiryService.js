import { EXPIRY_WARNING_DAYS } from "./serviceConfig";
import { toISODate } from "../utils/formatDate";

// Contract expiry — worked out in the app from the REAL contract end date (MAZ contracts.to_date → contract.endDate).
// The warning window is EXPIRY_WARNING_DAYS — the CONFIRMED 10-day rule (serviceConfig.js). This file is the single
// source of truth for expiry: everything (dashboard alert, contract rows, Contract Details, renewal eligibility,
// notifications) reads contract.expiry / getExpiryStatus from here.
// There's no MAZ expiry endpoint; nothing here is sent anywhere. The contract is never changed — callers attach
// the result as contract.expiry.

// The warning window: always the confirmed EXPIRY_WARNING_DAYS rule (10 days). (A temporary 365-day demo override was
// removed, client 2026-10-08 — the rule is permanent for normal behaviour.)
export function getExpiryWarningDays() {
  return EXPIRY_WARNING_DAYS;
}

// Shown with every expiry alert — states the rule and that the alert comes from the app, not MAZ.
export function getExpiryNote() {
  return `Renewal opens ${EXPIRY_WARNING_DAYS} days before the end date. This alert is shown by the app — it isn't sent by MAZ.`;
}

const DAY_MS = 86400000;
// Whole calendar days from one "YYYY-MM-DD" to another (local dates, so no timezone drift).
const daysBetween = (fromISO, toISO) =>
  Math.round((new Date(`${toISO}T00:00:00`) - new Date(`${fromISO}T00:00:00`)) / DAY_MS);

// → { state, endDate, daysLeft, thresholdDays }
//   state "expired"  — the end date has passed (daysLeft < 0), or MAZ already marks the contract Expired
//         "expiring" — ends today or within the next thresholdDays days
//         "ok"       — ends later than that
//         "unknown"  — no end date in the data
export function getExpiryStatus(contract, { today = toISODate(new Date()), thresholdDays = getExpiryWarningDays() } = {}) {
  const endDate = contract?.endDate ?? null;
  if (!endDate) return { state: "unknown", endDate: null, daysLeft: null, thresholdDays };
  const daysLeft = daysBetween(today, endDate);
  let state = "ok";
  if (daysLeft < 0 || contract.status === "expired") state = "expired";
  else if (daysLeft <= thresholdDays) state = "expiring";
  return { state, endDate, daysLeft, thresholdDays };
}

// "Expires today" / "Expires in 1 day" / "Expires in 23 days" / "Ended 3 days ago" — for captions and alerts.
export function describeExpiry(expiry) {
  if (!expiry || expiry.daysLeft == null) return null;
  if (expiry.state === "expiring") {
    if (expiry.daysLeft === 0) return "Expires today";
    return `Expires in ${expiry.daysLeft} ${expiry.daysLeft === 1 ? "day" : "days"}`;
  }
  if (expiry.state === "expired" && expiry.daysLeft < 0) {
    const ago = -expiry.daysLeft;
    return `Ended ${ago} ${ago === 1 ? "day" : "days"} ago`;
  }
  return null;
}

// The date an expiry warning starts for this contract (end date − threshold), "YYYY-MM-DD" — used to date alerts.
export function warningStartDate(expiry) {
  if (!expiry?.endDate) return null;
  const start = new Date(`${expiry.endDate}T00:00:00`);
  start.setDate(start.getDate() - expiry.thresholdDays);
  return toISODate(start);
}
