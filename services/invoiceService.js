import { fetchRequests } from "./mockApi";
import { fetchContractsOrNone } from "./contractService";
import { paymentBadge } from "../utils/billStatus";

// One list of every invoice the signed-in account has (InvoicesScreen, user 2026-10-22), from two sources that are
// never mixed up:
//   • office request invoices — MOCK (services/mockApi.js, sample pricing, kept in this app) → demo: true
//   • contract bills — REAL MAZ receipts of the customer's contracts, Paid / Unpaid from billService's PROVISIONAL
//     rule (+ the session's demo payments) → provisional: true
// Nothing is calculated or invented here: each row carries the source's own number, date, amount and status.

const byDateDesc = (a, b) => {
  if (!a.date && !b.date) return 0;
  if (!a.date) return 1;
  if (!b.date) return -1;
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
};

// Pure: requests (fetchRequests) + contracts (fetchContracts) → rows, newest first (rows without a date last).
// Row: { key, kind "request" | "bill", number, title, date, amount, status "paid" | "paidDemo" | "unpaid" | null,
// demo, provisional, target { screen, params } }.
export function buildInvoiceList(requests = [], contracts = []) {
  const requestRows = requests
    .filter((request) => request.invoice)
    .map((request) => ({
      key: `request-${request.requestId}`,
      kind: "request",
      number: request.invoice.number,
      title: request.invoice.description ?? request.summary?.plan ?? "Office request",
      date: request.invoice.issuedOn ?? null,
      amount: request.invoice.amount,
      status: request.payment ? "paid" : "unpaid",
      demo: true,
      provisional: false,
      target: { screen: "RequestInvoice", params: { requestId: request.requestId } },
    }));
  const billRows = contracts.flatMap((contract) =>
    (contract.bills ?? []).map((bill) => ({
      key: `bill-${contract.id}-${bill.number}`,
      kind: "bill",
      number: bill.number,
      title: `${contract.id} · ${bill.periodLabel ?? "Rent"}`,
      date: bill.dueDate ?? null,
      amount: bill.amount,
      status: paymentBadge(bill.status, bill),
      demo: false,
      provisional: Boolean(bill.statusProvisional),
      target: { screen: "BillViewer", params: { contractId: contract.id, billNumber: bill.number } },
    }))
  );
  return [...requestRows, ...billRows].sort(byDateDesc);
}

// Every invoice of the signed-in account. An account with no MAZ customer gets only its office request invoices
// (no contracts request is made).
export async function fetchInvoices() {
  const [requests, contracts] = await Promise.all([fetchRequests(), fetchContractsOrNone()]);
  return buildInvoiceList(requests, contracts);
}
