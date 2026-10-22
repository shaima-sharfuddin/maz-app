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

// The only writes: the MAZ login / logout (services/mazAuth.js), the New User's MAZ login (POST /register —
// registerService.js), the email code (otpService.js), the forgot-password save (POST /resetpassword — ASSUMED route,
// passwordResetService.js), the Tap charge (POST /tap/create-charge, on unless EXPO_PUBLIC_TAP_PAYMENTS=false —
// tapPayments.js, tap-payments.test.mjs), the New User enquiry (POST /enquiries, off unless
// EXPO_PUBLIC_SEND_ENQUIRIES=true — enquiries.test.mjs) and the New User customer record (POST /customers, off unless
// EXPO_PUBLIC_SEND_CUSTOMERS=true — customers.test.mjs).
test("writes: no PUT / PATCH / DELETE; only mazAuth, otpService, registerService, passwordResetService, tapPayments, enquiryService and customerCreationService call post()", () => {
  const transport = readFileSync(new URL("../services/http/apiClient.js", import.meta.url), "utf8");
  assert.doesNotMatch(transport, /method:\s*["'](PUT|PATCH|DELETE)/i);
  for (const file of ["httpApi.js", "contractService.js", "billService.js", "paymentService.js", "renewalService.js", "notificationService.js", "violationService.js", "activityService.js", "registrationService.js", "mockApi.js", "authService.js"]) {
    const source = readFileSync(new URL(`../services/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\bpost\s*\(/, `${file} must not POST to MAZ`);
  }
  const posts = (file) => readFileSync(new URL(`../services/${file}`, import.meta.url), "utf8").match(/\bpost\(\s*"[^"]*"/g);
  assert.deepEqual(posts("enquiryService.js"), ['post("/enquiries"']);
  assert.deepEqual(posts("customerCreationService.js"), ['post("/customers"']);
  assert.deepEqual(posts("mazAuth.js"), ['post("/login"', 'post("/logout"']);
  assert.deepEqual(posts("otpService.js"), ['post("/sendotp"', 'post("/verifyotp"']);
  assert.deepEqual(posts("registerService.js"), ['post("/register"']);
  assert.deepEqual(posts("passwordResetService.js"), ['post("/resetpassword"']);
  assert.deepEqual(posts("tapPayments.js"), ['post("/tap/create-charge"']);
});
