// A failed READ must never look like a successful payment or renewal, and screens with such actions never show
// stale data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  api,
  contract,
  contractsBody,
  setRoutes,
  status,
  json,
  networkDown,
  calls,
  resetCalls,
  loginLiveCustomer,
  rejectionOf,
} from "./helpers.mjs";
import { toISODate } from "../utils/formatDate.js";

test("Payment Review: contracts fail → no payment plan, nothing paid, no success notification", async () => {
  await loginLiveCustomer();
  setRoutes({ "/contracts": status(503) });
  const error = await rejectionOf(api.preparePayment({ type: "account" }));
  assert.equal(error?.code, "SERVER");

  setRoutes({});
  const contracts = await api.fetchContracts();
  assert.ok(contracts.flatMap((c) => c.bills).every((bill) => !bill.demoPaid), "no bill became paid");
  const notifications = await api.fetchNotifications("tenant");
  assert.ok(!notifications.some((n) => /payment successful/i.test(n.title)));
});

test("Renewal request: the contract read fails → no renewal created, no 'submitted' notification", async () => {
  await loginLiveCustomer();
  setRoutes({ "/contracts": networkDown() });
  const real = await rejectionOf(api.requestRenewal("CN-TEST-0001", { termMonths: 3 }));
  assert.equal(real?.code, "NETWORK");
  assert.equal(await api.fetchRenewal("CN-TEST-0001"), null);

  setRoutes({});
  const notifications = await api.fetchNotifications("tenant");
  assert.ok(!notifications.some((n) => /renewal request submitted/i.test(n.title)));
});

// The only write is the New User enquiry (POST /enquiries, off unless EXPO_PUBLIC_SEND_ENQUIRIES=true — enquiries.test.mjs).
test("writes: the MAZ transport has no PUT / PATCH / DELETE, and only enquiryService calls post()", () => {
  const transport = readFileSync(new URL("../services/httpClient.js", import.meta.url), "utf8");
  assert.doesNotMatch(transport, /method:\s*["'](PUT|PATCH|DELETE)/i);
  for (const file of ["httpApi.js", "contractService.js", "billService.js", "paymentService.js", "renewalService.js", "notificationService.js", "violationService.js", "activityService.js", "registrationService.js", "mockApi.js"]) {
    const source = readFileSync(new URL(`../services/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\bpost\s*\(/, `${file} must not POST to MAZ`);
  }
  const enquiries = readFileSync(new URL("../services/enquiryService.js", import.meta.url), "utf8");
  assert.deepEqual(enquiries.match(/\bpost\(\s*"[^"]*"/g), ['post("/enquiries"']);
});

test("screens with Pay / Renew actions never keep stale data (no keepDataOnError)", () => {
  for (const screen of ["RequestStatusScreen", "ContractDetailScreen", "PaymentReviewScreen", "BillViewerScreen", "RenewContractScreen", "PaymentScreen", "RequestInvoiceScreen"]) {
    const source = readFileSync(new URL(`../screens/${screen}.js`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /keepDataOnError/, `${screen} must not show stale data next to an action`);
  }
});

// The demo actions themselves never reach MAZ. Their contract reads are done first (they may use the network or the
// 60 s cache); from then on the network is cut and every request is recorded — the action must make none.
test("submitPayment makes zero network requests (success and decline)", async () => {
  await loginLiveCustomer();
  setRoutes({});
  for (const testOutcome of ["succeed", "decline"]) {
    const billNumber = testOutcome === "succeed" ? "CN-TEST-0001-1" : "CN-TEST-0001-2";
    const plan = await api.preparePayment({ type: "bill", contractId: "CN-TEST-0001", billNumber });
    setRoutes({ "/": networkDown() });
    resetCalls();
    const result = await api.submitPayment(plan, api.getPaymentMethods()[0].id, { testOutcome });
    assert.equal(result.status, testOutcome === "succeed" ? "succeeded" : "failed");
    assert.deepEqual(calls, [], `no request during a ${testOutcome} demo payment`);
    setRoutes({});
  }
});

test("requestRenewal and advanceRenewalDemo make zero network requests", async () => {
  await loginLiveCustomer();
  const endsSoon = new Date();
  endsSoon.setDate(endsSoon.getDate() + 5); // inside the 10-day renewal window
  const renewable = contract({ id: 909, name: "CN-TEST-RENEW", to_date: toISODate(endsSoon), receipts: [] });
  setRoutes({ "/contracts": json(contractsBody([renewable])) });
  await api.fetchContract("CN-TEST-RENEW"); // the read (cached for 60 s)

  setRoutes({ "/": networkDown() });
  resetCalls();
  const renewal = await api.requestRenewal("CN-TEST-RENEW", { termMonths: 3 });
  assert.equal(renewal.status, "requested");
  assert.equal(renewal.demo, true);
  assert.deepEqual(calls, [], "no request while submitting the renewal");

  assert.equal((await api.advanceRenewalDemo("CN-TEST-RENEW")).status, "reviewing");
  assert.equal((await api.advanceRenewalDemo("CN-TEST-RENEW")).status, "approved");
  assert.deepEqual(calls, [], "no request while advancing the demo renewal");
  setRoutes({});
});
