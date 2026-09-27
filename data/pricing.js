import { toISODate } from "../utils/formatDate";

// Duration options and price estimates for an office request (from the recruiter's
// "Select your duration" wireframe). Shared by SelectTermScreen and SubmitRequestScreen.

export const TERM_OPTIONS = [1, 3, 6, 12]; // months
export const DEFAULT_TERM_MONTHS = 1;

// ⚠️ PLACEHOLDER — the wireframe's sample rate (BHD 100.000 per month) applied to every plan.
// Replace with real per-plan pricing from the API once available.
export const PLACEHOLDER_MONTHLY_RATE_BHD = 100;

// ⚠️ PLACEHOLDER — location selection isn't designed yet; MAZ assigns the actual unit.
export const PLACEHOLDER_LOCATION = "Seef District";

export function formatTerm(months) {
  return `${months} ${months === 1 ? "month" : "months"}`;
}

// Bahraini dinar uses 3 decimal places: 1200 → "BHD 1,200.000".
export function formatBHD(amount) {
  const [whole, fraction] = amount.toFixed(3).split(".");
  return `BHD ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction}`;
}

export function estimateTotal(months, monthlyRate = PLACEHOLDER_MONTHLY_RATE_BHD) {
  return months * monthlyRate;
}

// Everything RequestSummaryCard needs for a plan + term. isPlaceholder stays true while the
// rate and location are placeholders, so the card labels them as samples on screen.
export function buildRequestSummary(planTitle, months) {
  return {
    plan: planTitle,
    location: PLACEHOLDER_LOCATION,
    term: formatTerm(months),
    monthlyRate: `${formatBHD(PLACEHOLDER_MONTHLY_RATE_BHD)}/month`,
    estimatedPrice: formatBHD(estimateTotal(months)),
    isPlaceholder: true,
  };
}

// New end date after extending a contract by `months`: "2026-12-31" + 3 → "2027-03-31".
// Works from the day after the current end, so month-end contracts stay month-end.
export function extendEndDate(endDate, months) {
  const date = new Date(`${endDate}T00:00:00`);
  date.setDate(date.getDate() + 1);
  date.setMonth(date.getMonth() + months);
  date.setDate(date.getDate() - 1);
  return toISODate(date);
}
