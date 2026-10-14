// New User customer record → POST /customers (services/customerCreationService.js + registrationService.js). Every
// request goes to the fake fetch in helpers.mjs — nothing ever reaches MAZ. Sending is OFF unless
// EXPO_PUBLIC_SEND_CUSTOMERS=true. The body copies MAZ's existing customer records (not a confirmed spec) and NEVER
// carries CPR / passport numbers (GET /customers is public). A created customer is never linked to the login.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { api, auth, setRoutes, status, json, resetCalls, callsTo, TEST_OTP_CODE } from "./helpers.mjs";
import { toApiCustomer, CUSTOMER_FIXED_FIELDS } from "../services/apiMappers.js";
import { customerDataSource } from "../services/customerService.js";

const signUp = (overrides = {}) => ({
  companyName: "  Test Holdings ",
  customerName: " Test Person ",
  gender: "m",
  activities: ["702 Management consultancy activities", "6201 Computer programming"],
  email: ` customer-${Math.random().toString(36).slice(2)}@example.com `,
  phoneCountry: "BH",
  countryCode: "+973",
  phoneNumber: "36123456",
  nationality: "Bahrain",
  idType: "cpr",
  cprNumber: "880112345",
  passportNumber: "",
  remarks: " Need a 4-desk office. ",
  ...overrides,
});

// Records each POST /customers.
let posted = [];
const acceptCustomer = (answer = (body) => json(JSON.stringify({ data: body }), 201)()) => (path, init) => {
  const body = JSON.parse(init.body);
  posted.push({ method: init.method, headers: init.headers, body });
  return answer(body);
};

beforeEach(() => {
  posted = [];
  resetCalls();
  setRoutes({});
  process.env.EXPO_PUBLIC_SEND_CUSTOMERS = "true";
  delete process.env.EXPO_PUBLIC_SEND_ENQUIRIES; // the enquiry stays off unless a test turns it on
});

test("toApiCustomer: company = customer, the person = its owner; fixed codes as in the existing records", () => {
  assert.deepEqual(toApiCustomer(signUp({ email: "a@example.com" })), {
    name: "Test Holdings",
    name_ar: "Test Holdings",
    email: "a@example.com",
    status: 1,
    isIncubation: 0,
    lmraStatus: 0,
    isVatOn: 0,
    company_id: 2,
    owners: [{ name: "Test Person", mobile: "0097336123456", email: "a@example.com", country: "Bahrain", gender: "m", type: "o" }],
  });
  assert.deepEqual(CUSTOMER_FIXED_FIELDS, { status: 1, isIncubation: 0, lmraStatus: 0, isVatOn: 0, company_id: 2 });
});

test("never sent: CPR / passport numbers, activities, remarks; nationality 'Other' → no country", () => {
  const body = JSON.stringify(toApiCustomer(signUp({ nationality: "Other", cprNumber: "", passportNumber: "P1234567" })));
  assert.doesNotMatch(body, /880112345|P1234567|cpr|passport|activit|6201|remarks|Need a 4-desk/i);
  assert.equal(JSON.parse(body).owners[0].country, null);
});

test("switched off (default): sign-up makes NO request and reports 'disabled'", async () => {
  delete process.env.EXPO_PUBLIC_SEND_CUSTOMERS;
  setRoutes({ "/customers": acceptCustomer() });
  const result = await api.registerNewUser(signUp());
  assert.equal(result.customer.status, "disabled");
  assert.equal(callsTo("/customers"), 0);
  assert.equal(callsTo(""), callsTo("/sendotp"), "only the verification code is requested");
  assert.equal(posted.length, 0);
});

test("success: one JSON POST to /customers → recorded; no session is created and no customer data is loaded", async () => {
  setRoutes({ "/customers": acceptCustomer() });
  const values = signUp();
  const result = await api.registerNewUser(values);
  assert.equal(result.customer.status, "recorded");
  assert.equal(posted.length, 1);
  assert.equal(posted[0].method, "POST");
  assert.equal(posted[0].headers["Content-Type"], "application/json");
  assert.deepEqual(posted[0].body, toApiCustomer(values));

  const verified = await api.verifyEmail({ email: result.email, code: TEST_OTP_CODE });
  assert.deepEqual(verified, { verified: true }, "never a session — signing in needs the MAZ login");
  // Even a hand-built session naming the created customer is not verified → no customer data.
  auth.setCurrentSession({ token: "forged", user: { email: result.email, customerId: "1", identity: "maz" } });
  assert.equal(customerDataSource(), null);
  await assert.rejects(api.fetchContracts(), { code: "NO_CUSTOMER" });
});

test("422 → customer failed (VALIDATION, field names kept); the account and the enquiry are unaffected", async () => {
  process.env.EXPO_PUBLIC_SEND_ENQUIRIES = "true";
  setRoutes({
    "/customers": acceptCustomer(() => json(JSON.stringify({ message: "x", errors: { name_ar: ["required"], crRegNo: ["required"] } }), 422)()),
    "/enquiries": (path, init) => json(JSON.stringify({ data: JSON.parse(init.body) }), 201)(),
  });
  const result = await api.registerNewUser(signUp());
  assert.equal(result.customer.status, "failed");
  assert.equal(result.customer.code, "VALIDATION");
  assert.equal(result.enquiry.status, "recorded", "the enquiry is sent independently");
  const verified = await api.verifyEmail({ email: result.email, code: TEST_OTP_CODE });
  assert.equal(verified.verified, true, "the demo verification still works");
});

test("server error → failed SERVER; its HTML never reaches the message", async () => {
  setRoutes({ "/customers": acceptCustomer(() => status(500)()) });
  const result = await api.registerNewUser(signUp());
  assert.equal(result.customer.status, "failed");
  assert.equal(result.customer.code, "SERVER");
  assert.doesNotMatch(result.customer.message, /Whoops|Stack trace|<html/i);
});

test("duplicates: identical details are posted once per app run; a failure isn't remembered", async () => {
  const values = signUp();
  setRoutes({ "/customers": acceptCustomer(() => status(503)()) });
  await assert.rejects(api.submitSignUpCustomer(values), { code: "SERVER" });
  setRoutes({ "/customers": acceptCustomer() });
  const [a, b] = await Promise.all([api.submitSignUpCustomer(values), api.submitSignUpCustomer(values)]);
  assert.equal(a.status, "recorded");
  assert.equal(b.status, "recorded");
  const again = await api.submitSignUpCustomer(values);
  assert.equal(again.duplicate, true);
  assert.equal(posted.length, 2, "one failed attempt + one shared successful POST");
});
