import { toISODate } from "../utils/formatDate";
import { INSTALLMENTS } from "./enums";

// Term, payment frequency and price estimates for an office request (SelectTermScreen →
// SubmitRequestScreen → the request's invoice), plus renewal terms (RenewContractScreen).

// Lease length for a new request: any whole number of months in this range (client decision, 2026-10-07 —
// replaces the recruiter's earlier fixed 9-month term). Quick picks are shortcuts on SelectTerm's stepper.
export const MIN_LEASE_MONTHS = 1;
export const MAX_LEASE_MONTHS = 36;
export const DEFAULT_LEASE_MONTHS = 1;
export const LEASE_QUICK_PICKS = [3, 6, 9, 12];

// Renewals still offer a choice of length — the fixed term applies to new contracts only.
export const RENEWAL_TERM_OPTIONS = [1, 3, 6, 12]; // months
export const DEFAULT_RENEWAL_TERM_MONTHS = 1;

// How often the tenant pays, from the backend's INSTALLMENTS enum (value = installments per year, as the
// API stores it in contracts.installment). Listed explicitly so Monthly comes first — iterating the enum
// object would order the numeric keys Yearly → Monthly.
export const PAYMENT_FREQUENCY_OPTIONS = ["12", "4", "2", "1"].map((value) => ({ value, label: INSTALLMENTS[value] }));

// ⚠️ PLACEHOLDER — the wireframe's sample rate (BHD 100.000 per month) applied to every plan.
// Replace with real per-plan pricing from the API once available.
export const PLACEHOLDER_MONTHLY_RATE_BHD = 100;

// ⚠️ PLACEHOLDER — the security deposit charged on the first invoice. BHD 100 matches the real sample
// contracts' deposit_amt ("100.00"); replace with the real amount once MAZ confirms it.
export const PLACEHOLDER_DEPOSIT_BHD = 100;

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

// One payment period's rent: the months it covers (12 ÷ installments per year) × the monthly rate,
// capped at the lease length — e.g. Yearly on a 9-month lease is a single 9-month payment.
// 9 months: Monthly 100 · Quarterly 300 (as in the real data) · Half-Yearly 600 · Yearly 900.
export function firstInstallmentAmount(
  installmentsPerYear,
  months = DEFAULT_LEASE_MONTHS,
  monthlyRate = PLACEHOLDER_MONTHLY_RATE_BHD
) {
  const periodMonths = Math.min(12 / Number(installmentsPerYear), months);
  return periodMonths * monthlyRate;
}

// The first invoice covers the first installment AND the deposit (recruiter decision, 2026-10-05).
// Kept as separate amounts so every screen can show both lines, not just the total.
export function firstInvoice(installmentsPerYear, months = DEFAULT_LEASE_MONTHS) {
  const installment = firstInstallmentAmount(installmentsPerYear, months);
  const deposit = PLACEHOLDER_DEPOSIT_BHD;
  return { installment, deposit, total: installment + deposit };
}

export const paymentFrequencyLabel = (installmentsPerYear) => INSTALLMENTS[installmentsPerYear] ?? null;

// Everything RequestSummaryCard needs. isPlaceholder stays true while the rate, deposit and location
// are placeholders, so the card labels them as samples on screen.
export function buildRequestSummary(planTitle, months, paymentFrequency) {
  const invoice = firstInvoice(paymentFrequency, months);
  return {
    plan: planTitle,
    location: PLACEHOLDER_LOCATION,
    term: formatTerm(months),
    paymentFrequency: paymentFrequencyLabel(paymentFrequency),
    monthlyRate: `${formatBHD(PLACEHOLDER_MONTHLY_RATE_BHD)}/month`,
    estimatedPrice: formatBHD(estimateTotal(months)), // whole contract
    firstInstallment: formatBHD(invoice.installment),
    deposit: formatBHD(invoice.deposit),
    firstInvoiceTotal: formatBHD(invoice.total),
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
