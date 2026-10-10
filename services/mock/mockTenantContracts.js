import { toUiBill, toUiContract } from "../apiMappers";
import { toISODate } from "../../utils/formatDate";
import { listDemoContracts } from "./mockDemoContracts";

// ⚠️ DEMO TENANT DATA — the ONLY contracts, bills and receipts the MOCK demo tenant ever sees. NOT MAZ data.
//
// While auth is mock, a demo login can't prove whose data it may see, so it never loads MAZ's live customer data
// (services/customerService.js customerDataSource → "demo"; services/httpApi.js refuses customer data unless the
// source is "live"). These sample records stand in for it, so the recruiter demos — contract list and details,
// bills, Paid / Unpaid, demo payments, receipts, the expiry alert and renewal — work exactly as they will with MAZ.
//
// They're written in MAZ's API shape and mapped with the same services/apiMappers.js functions as live data, so every
// screen, the provisional paid rule (billService), the payment figures (paymentSummary) and the demo payment ledger
// treat them exactly like real contracts. Dates are relative to today, so the demo never goes stale:
//   • DEMO-CN-0001 — ACTIVE, 12 months, quarterly: Q1 paid, Q2 due (date passed), Q3 / Q4 upcoming
//   • DEMO-CN-0002 — EXPIRED last month, 6 months, half-yearly, fully paid
//   • DEMO-RENEWAL-001 — ACTIVE, ends in 7 days, no bills (services/mock/mockDemoContracts.js — the renewal demo)
// Everything carries demo: true (screens show "Demo data"). No network request; nothing is sent to MAZ.
// Remove with the mock auth provider once MAZ authentication exists.

const DEMO_UNITS = new Map([
  [901, { id: 901, name: "Demo Suite 204", is_incubation: 0 }],
  [902, { id: 902, name: "Demo Office 118", is_incubation: 0 }],
]);

// First day of the month `months` away from today's month (day 1, so month lengths never overflow).
const monthStart = (months, today = new Date()) => new Date(today.getFullYear(), today.getMonth() + months, 1);
const dayBefore = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
const iso = (date) => toISODate(date);

function receipt(contractName, n, { amount, dueDate, paidOn = null, description }) {
  return {
    vch_no: `${contractName}-${n}`,
    description,
    sale_amt: String(amount),
    vat_amt: "0",
    due_date: iso(dueDate),
    receipt_date: paidOn ? iso(paidOn) : null, // the provisional paid rule (billService): receipt_date set = paid
    receipt_amt: paidOn ? String(amount) : null,
    receipt_on: paidOn ? iso(paidOn) : null,
  };
}

function rawDemoContracts(today = new Date()) {
  // DEMO-CN-0001: started at the start of the month 4 months ago → quarters start at +0, +3, +6, +9 months.
  const start1 = monthStart(-4, today);
  const quarter = (q) => monthStart(-4 + q * 3, today);
  const active = {
    id: -1,
    name: "DEMO-CN-0001",
    customer_id: null,
    unit_id: 901,
    status: "c", // Active
    from_date: iso(start1),
    to_date: iso(dayBefore(monthStart(8, today))),
    rent_monthly_amt: "300.00",
    number_of_months: 12,
    installment: "4", // Quarterly
    deposit_amt: "300.00",
    receipts: [0, 1, 2, 3].map((q) =>
      receipt("DEMO-CN-0001", q + 1, {
        amount: 900,
        dueDate: quarter(q),
        paidOn: q === 0 ? quarter(0) : null,
        description: `DEMO RENT Q${q + 1}`,
      })
    ),
  };

  // DEMO-CN-0002: a 6-month contract that ended at the end of last month — both half-yearly bills paid.
  const start2 = monthStart(-6, today);
  const expired = {
    id: -2,
    name: "DEMO-CN-0002",
    customer_id: null,
    unit_id: 902,
    status: "d", // Expired
    from_date: iso(start2),
    to_date: iso(dayBefore(monthStart(0, today))),
    rent_monthly_amt: "200.00",
    number_of_months: 6,
    installment: "2", // Half-yearly
    deposit_amt: "200.00",
    receipts: [
      receipt("DEMO-CN-0002", 1, { amount: 600, dueDate: start2, paidOn: start2, description: "DEMO RENT H1" }),
      receipt("DEMO-CN-0002", 2, { amount: 600, dueDate: monthStart(-3, today), paidOn: monthStart(-3, today), description: "DEMO RENT H2" }),
    ],
  };
  return [active, expired];
}

const asDemo = (contract, customerId) => ({ ...contract, customerId, demo: true });

// Every demo contract for the demo tenant (customerId = the session's demo customer id), mapped like live data.
export function listDemoTenantContracts(customerId) {
  const mapped = rawDemoContracts().map((raw) => asDemo(toUiContract(raw, DEMO_UNITS), customerId));
  return [...mapped, ...listDemoContracts(customerId)];
}

// One demo contract by its number, or null.
export function getDemoTenantContract(contractId, customerId) {
  return listDemoTenantContracts(customerId).find((contract) => contract.id === contractId) ?? null;
}

// One demo bill (BillViewer) in the same shape as httpApi.fetchBill, or null.
export function getDemoTenantBill(contractId, billNumber, customerId) {
  const raw = rawDemoContracts().find((contract) => contract.name === contractId);
  const receiptRecord = raw?.receipts.find((item) => item.vch_no === billNumber);
  if (!receiptRecord) return null;
  return toUiBill(asDemo(toUiContract(raw, DEMO_UNITS), customerId), receiptRecord);
}
