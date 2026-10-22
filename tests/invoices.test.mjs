// The Invoices list (services/invoiceService.js): office request invoices (MOCK) + contract bills (REAL, provisional
// status) in one list, newest first; an account with no MAZ customer gets only its request invoices and makes no
// /contracts request.
import { test } from "node:test";
import assert from "node:assert/strict";
import { api, setRoutes, resetCalls, callsTo, loginLiveCustomer } from "./helpers.mjs";
import { buildInvoiceList } from "../services/invoiceService.js";
import { buildRequestSummary } from "../data/pricing.js";

const request = (requestId, invoice, payment = null) => ({ requestId, summary: { plan: "Office Space" }, invoice, payment });
const invoice = (number, issuedOn, amount) => ({ number, issuedOn, amount, description: "Office Space · 6 months" });

test("buildInvoiceList maps both sources, skips requests without an invoice, newest first", () => {
  const requests = [
    request("REQ-1", invoice("INV-2026-0001", "2026-10-01", 700)),
    request("REQ-2", invoice("INV-2026-0002", "2026-10-20", 900), { paidDate: "2026-10-21" }),
    request("REQ-3", null),
  ];
  const contracts = [
    {
      id: "CN-1",
      bills: [
        { number: "B-1", periodLabel: "RENT INST-1", dueDate: "2026-09-01", amount: 300, status: "paid", statusProvisional: true },
        { number: "B-2", periodLabel: null, dueDate: "2026-12-01", amount: 300, status: "unpaid", statusProvisional: true },
        { number: "B-3", periodLabel: "RENT INST-3", dueDate: null, amount: 300, status: "paid", demoPaid: true },
      ],
    },
  ];
  const list = buildInvoiceList(requests, contracts);

  assert.deepEqual(
    list.map((row) => row.number),
    ["B-2", "INV-2026-0002", "INV-2026-0001", "B-1", "B-3"],
    "newest first, undated last"
  );
  const paidRequest = list.find((row) => row.number === "INV-2026-0002");
  assert.equal(paidRequest.kind, "request");
  assert.equal(paidRequest.status, "paid");
  assert.equal(paidRequest.demo, true);
  assert.deepEqual(paidRequest.target, { screen: "RequestInvoice", params: { requestId: "REQ-2" } });
  assert.equal(list.find((row) => row.number === "INV-2026-0001").status, "unpaid");

  const bill = list.find((row) => row.number === "B-1");
  assert.equal(bill.kind, "bill");
  assert.equal(bill.title, "CN-1 · RENT INST-1");
  assert.equal(bill.provisional, true);
  assert.deepEqual(bill.target, { screen: "BillViewer", params: { contractId: "CN-1", billNumber: "B-1" } });
  assert.equal(list.find((row) => row.number === "B-2").title, "CN-1 · Rent");
  assert.equal(list.find((row) => row.number === "B-3").status, "paidDemo");
});

test("tenant: the customer's real bills are listed — never another customer's", async () => {
  await loginLiveCustomer();
  setRoutes({});
  const list = await api.fetchInvoices();
  const numbers = list.filter((row) => row.kind === "bill").map((row) => row.number);
  assert.deepEqual(numbers.sort(), ["CN-TEST-0001-1", "CN-TEST-0001-2"]);
  assert.ok(list.every((row) => !row.number.startsWith("CN-OTHER")));
});

test("no MAZ customer: only request invoices, no /contracts request; Contracts tab gets an empty list", async () => {
  await loginLiveCustomer(null);
  setRoutes({});
  resetCalls();
  await api.submitRequest({
    fullName: "x",
    email: "x",
    companyName: "x",
    activities: null,
    remark: "",
    termMonths: 6,
    cr: null,
    summary: buildRequestSummary("Office Space", 6),
  });
  const list = await api.fetchInvoices();
  assert.equal(list.length, 1);
  assert.equal(list[0].kind, "request");
  assert.equal(list[0].status, "unpaid");
  assert.deepEqual(await api.fetchContractsOrNone(), []);
  assert.equal(callsTo("/contracts"), 0);
});
