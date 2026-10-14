import { toISODate } from "../utils/formatDate";

// Term and price estimates for an office request (SelectTermScreen → ReviewRequestScreen → the request's invoice),
// plus renewal terms (RenewContractScreen).

// Lease length for a new request: any whole number of months in this range (client decision, 2026-10-07 —
// replaces the recruiter's earlier fixed 9-month term). Quick picks are shortcuts on SelectTerm's stepper.
export const MIN_LEASE_MONTHS = 1;
export const MAX_LEASE_MONTHS = 36;
export const DEFAULT_LEASE_MONTHS = 1;
export const LEASE_QUICK_PICKS = [3, 6, 9, 12];

// Renewals still offer a choice of length — the fixed term applies to new contracts only.
export const RENEWAL_TERM_OPTIONS = [1, 3, 6, 12]; // months
export const DEFAULT_RENEWAL_TERM_MONTHS = 1;

// New office requests are paid IN FULL, upfront (2026-10-14 — replaces the Monthly / Quarterly / Half-Yearly / Yearly
// choice): the first invoice carries the whole lease's rent. Existing MAZ contracts keep their own installments.
export const PAYMENT_IN_FULL_LABEL = "In full, upfront";

// ⚠️ PLACEHOLDER — the wireframe's sample rate (BHD 100.000 per month) applied to every plan.
// Replace with real per-plan pricing from the API once available.
export const PLACEHOLDER_MONTHLY_RATE_BHD = 100;

// ⚠️ PLACEHOLDER — the security deposit charged on the first invoice. BHD 100 matches the real sample
// contracts' deposit_amt ("100.00"); replace with the real amount once MAZ confirms it.
export const PLACEHOLDER_DEPOSIT_BHD = 100;

// ⚠️ PLACEHOLDER — the charge for MAZ registering a NEW commercial registration (Office Suites → "I need a new CR",
// CommercialRegistrationScreen), added as its own line on the first invoice. Replace once MAZ gives the real fee.
export const CR_REGISTRATION_FEE_BHD = 100;

// The two answers on CommercialRegistrationScreen. A request's `cr` is { option: "existing" | "new", number }.
export const CR_OPTIONS = { existing: "existing", new: "new" };
export const isNewCr = (cr) => cr?.option === CR_OPTIONS.new;
// "Existing CR · 123456-1" / "New CR registration"; null when the request has no CR answer (other services).
export function crLabel(cr) {
  if (!cr?.option) return null;
  return isNewCr(cr) ? "New CR registration" : `Existing CR · ${cr.number}`;
}

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

// The first (and only) invoice: the WHOLE lease's rent (paid in full) AND the deposit — separate amounts so every
// screen can show each line, not just the total. `newCr`: the tenant asked MAZ to register a new CR → the (sample)
// CR registration fee is added too. 6 months → rent 600 + deposit 100 (+ CR fee 100).
export function firstInvoice(months = DEFAULT_LEASE_MONTHS, { newCr = false } = {}) {
  const rent = estimateTotal(months);
  const deposit = PLACEHOLDER_DEPOSIT_BHD;
  const crFee = newCr ? CR_REGISTRATION_FEE_BHD : 0;
  return { rent, deposit, crFee, total: rent + deposit + crFee };
}

// "Rent (6 months)" — the rent line's label on the estimate, summary and invoice.
export const rentLineLabel = (months) => `Rent (${formatTerm(months)})`;

// Everything RequestSummaryCard needs. isPlaceholder stays true while the rate, deposit and location
// are placeholders, so the card labels them as samples on screen.
// `cr` (Office Suites only): the CommercialRegistration answer — shown as a row, and a new CR adds its fee.
export function buildRequestSummary(planTitle, months, cr = null) {
  const invoice = firstInvoice(months, { newCr: isNewCr(cr) });
  return {
    plan: planTitle,
    cr: crLabel(cr),
    crFee: invoice.crFee ? formatBHD(invoice.crFee) : null,
    location: PLACEHOLDER_LOCATION,
    term: formatTerm(months),
    payment: PAYMENT_IN_FULL_LABEL,
    monthlyRate: `${formatBHD(PLACEHOLDER_MONTHLY_RATE_BHD)}/month`,
    rentLabel: rentLineLabel(months),
    rent: formatBHD(invoice.rent), // the whole lease, paid in full
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
