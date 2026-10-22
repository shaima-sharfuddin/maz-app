// Tap payments → POST /tap/create-charge (services/tapPayments.js via paymentService). Every request goes to the fake
// fetch in helpers.mjs — nothing ever reaches MAZ or Tap. Live charges are ON unless EXPO_PUBLIC_TAP_PAYMENTS=false.
import { test, beforeEach } from "node:test";
import { paymentContactSchema } from "../validation/schemas.js";
import assert from "node:assert/strict";
import { api, setRoutes, json, status, resetCalls, requests, callsTo, loginLiveCustomer, rejectionOf } from "./helpers.mjs";
import { toApiTapCharge, toUiTapCharge, toUiTapResult } from "../services/apiMappers.js";
import { isTapCallbackUrl, parseTapCallback, TAP_CALLBACK_URL } from "../services/tapPayments.js";

// MAZ's real success body (Postman, 2026-10-20), with a made-up token / charge id.
const TAP_ANSWER = { payment_url: "https://checkout.tap.company/?mode=page&language=en&token=abc", charge_id: "chg_TEST123" };
const CUSTOMER = { name: "Live Customer", email: "live@example.com", mobile: "+973 3612 3456" };

beforeEach(() => {
  resetCalls();
  setRoutes({});
  delete process.env.EXPO_PUBLIC_TAP_PAYMENTS; // the default: live Tap
});

const chargeRequests = () => requests.filter((r) => r.path === "/tap/create-charge");

test("toApiTapCharge sends MAZ's five fields — amount to 3 decimals, local mobile digits", () => {
  assert.deepEqual(toApiTapCharge({ amount: 300.0004, orderId: "CN-1-1", customer: { ...CUSTOMER, name: " A " } }), {
    amount: 300,
    order_id: "CN-1-1",
    customer_name: "A",
    customer_email: "live@example.com",
    customer_mobile: "36123456",
  });
  assert.equal(toApiTapCharge({ amount: 1, orderId: "x", customer: { mobile: "0097336123456" } }).customer_mobile, "36123456");
  assert.equal(toApiTapCharge({ amount: 1, orderId: "x", customer: { mobile: "36123456" } }).customer_mobile, "36123456");
});

test("toUiTapCharge reads MAZ's { payment_url, charge_id } — only Tap's https checkout page", () => {
  assert.deepEqual(toUiTapCharge(TAP_ANSWER), { chargeId: "chg_TEST123", checkoutUrl: TAP_ANSWER.payment_url });
  assert.equal(toUiTapCharge({ data: TAP_ANSWER }).chargeId, "chg_TEST123");
  const raw = toUiTapCharge({ id: "chg_RAW", transaction: { url: "https://checkout.tap.company/?token=x" } });
  assert.deepEqual(raw, { chargeId: "chg_RAW", checkoutUrl: "https://checkout.tap.company/?token=x" });
  assert.equal(toUiTapCharge({ payment_url: "https://evil.example/checkout.tap.company/", charge_id: "c" }), null);
  assert.equal(toUiTapCharge({ payment_url: "http://checkout.tap.company/?token=x" }), null);
  assert.equal(toUiTapCharge({ message: "ok" }), null);
  assert.equal(toUiTapCharge(null), null);
});

test("the mobile rule: a Bahrain number is required", () => {
  assert.equal(paymentContactSchema.safeParse({ mobile: "" }).success, false);
  assert.equal(paymentContactSchema.safeParse({ mobile: "12" }).success, false);
  assert.equal(paymentContactSchema.safeParse({ mobile: "+973 3612 3456" }).success, true);
});

test("no mobile known: customer_mobile is left out, not sent empty", () => {
  const body = toApiTapCharge({ amount: 1, orderId: "x", customer: { name: "A", email: "a@b.c", mobile: null } });
  assert.equal("customer_mobile" in body, false);
  assert.equal("customer_mobile" in toApiTapCharge({ amount: 1, orderId: "x", customer: { mobile: "" } }), false);
});

test("live: submitPayment creates the charge with the Bearer token and returns Tap's page — nothing marked paid", async () => {
  await loginLiveCustomer(1);
  setRoutes({ "/tap/create-charge": json(JSON.stringify(TAP_ANSWER)) });
  assert.deepEqual(api.getPaymentMethods().map((m) => m.id), ["tap"]);

  const plan = await api.preparePayment({ type: "account" });
  const result = await api.submitPayment(plan, "tap", { customer: CUSTOMER });
  assert.equal(result.status, "checkout");
  assert.equal(result.checkoutUrl, TAP_ANSWER.payment_url);
  assert.equal(result.chargeId, "chg_TEST123");

  const [sent] = chargeRequests();
  assert.equal(sent.method, "POST");
  assert.match(sent.headers.Authorization ?? sent.headers.authorization, /^Bearer TKN-LIVE-/);
  const body = JSON.parse(sent.body);
  assert.equal(body.amount, plan.amount);
  assert.equal(body.order_id, result.orderId);
  assert.ok(body.order_id.startsWith(plan.bills.length === 1 ? plan.bills[0].number : plan.contractIds[0]));
  assert.equal(body.customer_mobile, "36123456");

  const contract = await api.fetchContract("CN-TEST-0001");
  assert.ok(contract.bills.every((bill) => !bill.demoPaid), "a started charge never marks bills paid");
  const notifications = await api.fetchNotifications("tenant");
  assert.ok(!notifications.some((n) => /payment successful/i.test(n.title)));
});

test("live: a 422 → PAYMENT_REJECTED; a failed 2xx → PAYMENT_NOT_STARTED; no link → INVALID_RESPONSE", async () => {
  await loginLiveCustomer(1);
  const plan = await api.preparePayment({ type: "account" });

  setRoutes({ "/tap/create-charge": json('{"errors":{"customer_mobile":["invalid"]}}', 422) });
  assert.equal((await rejectionOf(api.submitPayment(plan, "tap", { customer: CUSTOMER })))?.code, "PAYMENT_REJECTED");

  setRoutes({ "/tap/create-charge": json('{"status":false,"message":"Tap error"}') });
  assert.equal((await rejectionOf(api.submitPayment(plan, "tap", { customer: CUSTOMER })))?.code, "PAYMENT_NOT_STARTED");

  setRoutes({ "/tap/create-charge": json('{"message":"ok"}') });
  assert.equal((await rejectionOf(api.submitPayment(plan, "tap", { customer: CUSTOMER })))?.code, "INVALID_RESPONSE");

  setRoutes({ "/tap/create-charge": status(500) });
  assert.equal((await rejectionOf(api.submitPayment(plan, "tap", { customer: CUSTOMER })))?.code, "SERVER");
});

test("EXPO_PUBLIC_TAP_PAYMENTS=false: the demo provider is used and nothing is sent to Tap", async () => {
  process.env.EXPO_PUBLIC_TAP_PAYMENTS = "false";
  await loginLiveCustomer(1);
  const plan = await api.preparePayment({ type: "account" });
  const result = await api.submitPayment(plan, api.getPaymentMethods()[0].id);
  assert.equal(result.status, "succeeded");
  assert.equal(callsTo("/tap"), 0);
});

test("office request invoice: submitInvoicePayment charges the invoice amount, order id = invoice number + timestamp", async () => {
  await loginLiveCustomer(null);
  setRoutes({ "/tap/create-charge": json(JSON.stringify(TAP_ANSWER)) });
  const result = await api.submitInvoicePayment({ invoiceNumber: "INV-2026-0042", outstanding: 1300 }, { customer: CUSTOMER });
  assert.equal(result.status, "checkout");
  assert.equal(result.checkoutUrl, TAP_ANSWER.payment_url);
  const body = JSON.parse(chargeRequests()[0].body);
  assert.equal(body.amount, 1300);
  assert.match(body.order_id, /^INV-2026-0042-\d+$/);
});

// ---- the callback page (Tap → MAZ's /tap/callback → the checkout WebView reads its JSON) ----

// MAZ's real callback answer (2026-10-20, Tap sandbox), trimmed to the fields the app reads.
const capturedCallback = (overrides = {}) => ({
  message: "Payment callback received",
  status: "CAPTURED",
  charge: {
    id: "chg_TS01A2120261623e9ZR2010991",
    status: "CAPTURED",
    amount: 1300,
    currency: "BHD",
    metadata: { order_id: "INV-2026-3242-1792513399921" },
    transaction: { date: { created: 1792513401993, completed: 1792513476526 } },
    reference: { payment: "22202616231000749830", order: "INV-2026-3242-1792513399921" },
    response: { code: "000", message: "Captured" },
    card: { brand: "VISA", scheme: "VISA", last_four: "1111" },
    receipt: { id: "202220261623107623", email: true, sms: false },
    ...overrides,
  },
});

test("toUiTapResult: CAPTURED → succeeded, with card, reference, order, time and emailed receipt", () => {
  const result = toUiTapResult(capturedCallback());
  assert.equal(result.outcome, "succeeded");
  assert.equal(result.chargeId, "chg_TS01A2120261623e9ZR2010991");
  assert.equal(result.amount, 1300);
  assert.equal(result.orderId, "INV-2026-3242-1792513399921");
  assert.equal(result.reference, "22202616231000749830");
  assert.deepEqual(result.card, { brand: "VISA", lastFour: "1111" });
  assert.equal(result.receiptEmailed, true);
  assert.match(result.paidAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
});

test("toUiTapResult: DECLINED / CANCELLED → failed with the gateway message; INITIATED → pending; junk → null", () => {
  const declined = toUiTapResult(capturedCallback({ status: "DECLINED", response: { code: "051", message: "Insufficient Funds" } }));
  assert.equal(declined.outcome, "failed");
  assert.equal(declined.message, "Insufficient Funds");
  assert.equal(toUiTapResult(capturedCallback({ status: "CANCELLED" })).outcome, "failed");
  assert.equal(toUiTapResult(capturedCallback({ status: "INITIATED" })).outcome, "pending");
  assert.equal(toUiTapResult({ message: "hello" }), null);
  assert.equal(toUiTapResult(null), null);
});

test("callback page: recognised by URL; its text parsed, garbage → null", () => {
  assert.ok(isTapCallbackUrl(`${TAP_CALLBACK_URL}?tap_id=chg_x`));
  assert.ok(!isTapCallbackUrl("https://checkout.tap.company/?token=x"));
  assert.equal(parseTapCallback(JSON.stringify(capturedCallback())).outcome, "succeeded");
  assert.equal(parseTapCallback("<html>Whoops</html>"), null);
  assert.equal(parseTapCallback(undefined), null);
});

test("completeTapPayment: a CAPTURED invoice payment marks the office request Paid; a failure leaves it unpaid", async () => {
  await loginLiveCustomer(null);
  const submitRequest = () =>
    api.submitRequest({ fullName: "x", email: "x", companyName: "x", activities: null, remark: "", termMonths: 3, cr: null, summary: { plan: "Office Suites" } });

  const failedRequest = await submitRequest();
  const failed = await api.completeTapPayment(
    { type: "invoice", requestId: failedRequest.requestId },
    toUiTapResult(capturedCallback({ status: "DECLINED" }))
  );
  assert.equal(failed.outcome, "failed");
  assert.equal((await api.fetchRequestStatus(failedRequest.requestId)).payment, null);

  const { requestId } = await submitRequest();
  const done = await api.completeTapPayment({ type: "invoice", requestId }, toUiTapResult(capturedCallback()));
  assert.equal(done.outcome, "succeeded");
  const status = await api.fetchRequestStatus(requestId);
  assert.equal(status.payment.receipt, "22202616231000749830");
  assert.equal(status.payment.method, "VISA •••• 1111");
  assert.equal(status.contract.status, "reviewing");
  assert.equal((await api.fetchRequestInvoice(requestId)).outstanding, 0);
});

test("completeTapPayment: an unreadable callback → pending (nothing recorded)", async () => {
  await loginLiveCustomer(null);
  const result = await api.completeTapPayment({ type: "bills", contractIds: ["CN-1"] }, null, { chargeId: "chg_X", amount: 300 });
  assert.equal(result.outcome, "pending");
  assert.equal(result.chargeId, "chg_X");
  assert.equal(result.amount, 300);
});

test("knownPayerMobile: the sign-up mobile of this app run, else null (the payment screen then asks)", async () => {
  const email = `payer-${Math.random().toString(36).slice(2)}@example.com`;
  assert.equal(api.knownPayerMobile(email), null);
  await api.quickSignUp({
    companyName: "Co",
    customerName: "Person",
    gender: "f",
    activities: ["702 Consulting"],
    email,
    countryCode: "+973",
    phoneNumber: "3612 3456",
    phoneCountry: "BH",
    nationality: "Bahrain",
    idType: "cpr",
    cprNumber: "880112345",
    passportNumber: "",
    remarks: "",
  });
  assert.equal(api.knownPayerMobile(email), "36123456");
  assert.equal(api.knownPayerMobile(` ${email.toUpperCase()} `), "36123456");
  assert.equal(api.knownPayerMobile(null), null);
});
