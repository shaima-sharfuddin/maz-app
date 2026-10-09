import { fetchBill as fetchBillFromMaz } from "./httpApi";
import { SERVICE_SOURCES } from "./serviceConfig";
import { getDemoPayment } from "./mock/demoPaymentLedger";

// Bills = a contract's installments (MAZ contracts.receipts[]). The amounts, VAT, due dates and descriptions are
// REAL MAZ data; whether a bill is PAID is not confirmed by MAZ yet, so that one rule lives here, isolated.

// ⚠️ PROVISIONAL PAID RULE (SERVICE_SOURCES.billPaidStatus) — NOT an official MAZ rule.
// A bill counts as "paid" once its receipt has a receipt_date; otherwise "unpaid". MAZ may instead use
// receipt_on, receipt_amt, or something else — when they confirm, change ONLY this function.
// (Every real installment has receipt_date null today, so all show Unpaid.)
function provisionalStatus(bill) {
  return bill.receiptDate ? "paid" : "unpaid";
}

// Shown wherever a bill's paid / unpaid status appears, while the rule is provisional.
export const PAYMENT_STATUS_NOTE = "Provisional — MAZ confirms payments";
export const PAYMENT_STATUS_IS_PROVISIONAL = SERVICE_SOURCES.billPaidStatus === "provisional";

// Adds { status, statusProvisional } to a real MAZ bill (one that carries the raw receipt fields).
// ⚠️ DEMO OVERLAY: a bill paid with a DEMO payment this session (services/mock/demoPaymentLedger.js) shows as
// paid with demoPaid: true + demoPayment — only on screen; the real MAZ data underneath is unchanged.
// Anything else (e.g. an old mock bill that already has a status) is returned unchanged.
export function withPaymentStatus(bill) {
  if (!("receiptDate" in bill)) return bill;
  const demoPayment = getDemoPayment(bill.number);
  if (demoPayment) return { ...bill, status: "paid", statusProvisional: false, demoPaid: true, demoPayment };
  return { ...bill, status: provisionalStatus(bill), statusProvisional: PAYMENT_STATUS_IS_PROVISIONAL, demoPaid: false };
}

// One bill (BillViewer): REAL data from MAZ + the provisional status.
export async function fetchBill(contractId, billNumber) {
  return withPaymentStatus(await fetchBillFromMaz(contractId, billNumber));
}
