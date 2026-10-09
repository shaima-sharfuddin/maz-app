// Payment status shown on bills: just "paid" or "unpaid" (StatusBadge success / danger), per the
// recruiter (2026-10-05). The mock keeps finer internal states ("due" / "upcoming"), which its Pay
// flow relies on; they all display as Unpaid.
// ⚠️ PLACEHOLDER logic — real API bills get "paid" / "unpaid" from a placeholder rule in
// services/apiMappers.js (receipt_date set = paid) until the backend confirms its paid field.
// Pass the bill as the second argument so a bill paid with a DEMO payment shows "Paid (demo)" instead of "Paid".
export function paymentBadge(status, bill) {
  if (!status) return null;
  if (status === "paid") return bill?.demoPaid ? "paidDemo" : "paid";
  return "unpaid";
}
