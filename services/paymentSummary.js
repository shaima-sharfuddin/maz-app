import { toISODate } from "../utils/formatDate";

// Payment figures CALCULATED from the REAL MAZ installments (contracts.receipts[]) — no other data, no invented
// amounts. ⚠️ PROVISIONAL: "paid" comes from the provisional rule in services/billService.js (plus this session's
// demo payments), so every figure here is labelled "Provisional — not confirmed by MAZ" on screen.
// Pure functions (no network) — used by contractService (dashboard) and paymentService (Pay / Review).
//
// When MAZ provides real balances (e.g. per-contract total / paid / balance / due), return those instead.

export const PAYMENT_SUMMARY_NOTE = "Provisional — not confirmed by MAZ";

// The dashboard Payment card and its "Pay now" cover ACTIVE contracts only (client, 2026-10-08). Expired (and other)
// contracts keep their bills and Pay buttons on their own Contract / Bill Details screens. The DEMO contract
// (mockDemoContracts — no bills) is never part of the payment figures.
export function contractsForAccountPayments(contracts) {
  return contracts.filter((contract) => contract.status === "active" && !contract.demo);
}

const isUnpaid = (bill) => bill.status === "unpaid" || bill.status === "due";
const sum = (bills) => bills.reduce((total, bill) => total + (bill.amount ?? 0), 0);

// Every bill of the given contracts, tagged with its contract (for Pay / Review).
export function billsOf(contracts) {
  return contracts.flatMap((contract) =>
    (contract.bills ?? []).map((bill) => ({ ...bill, contractId: contract.id, unit: contract.unit ?? null }))
  );
}

// { total, paid, balance, due, demoPaidAmount, unpaidBills, dueBills } for one or more contracts.
// - total: all installments (rent + VAT)          - paid: installments counted as paid (provisional / demo)
// - balance: total − paid                          - due: unpaid installments whose due date is today or earlier
export function summarizePayments(contracts, today = toISODate(new Date())) {
  const bills = billsOf(contracts);
  const paidBills = bills.filter((bill) => bill.status === "paid");
  const unpaidBills = bills.filter(isUnpaid);
  const dueBills = unpaidBills.filter((bill) => bill.dueDate && bill.dueDate <= today);
  const total = sum(bills);
  const paid = sum(paidBills);
  return {
    total,
    paid,
    balance: total - paid,
    due: sum(dueBills),
    demoPaidAmount: sum(paidBills.filter((bill) => bill.demoPaid)),
    unpaidBills,
    dueBills,
  };
}

// What "Pay now" pays: the due amount first; otherwise the outstanding balance; nothing when the balance is 0.
// → { kind: "due" | "balance", amount, bills } or null.
export function payNowTarget(summary) {
  if (summary.due > 0) return { kind: "due", amount: summary.due, bills: summary.dueBills };
  if (summary.balance > 0) return { kind: "balance", amount: summary.balance, bills: summary.unpaidBills };
  return null;
}
