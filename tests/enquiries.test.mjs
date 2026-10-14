// New User enquiry → POST /enquiries (services/enquiryService.js + registrationService.js). Every request goes to the
// fake fetch in helpers.mjs — nothing ever reaches MAZ. Sending is OFF unless EXPO_PUBLIC_SEND_ENQUIRIES=true.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { api, setRoutes, status, json, networkDown, calls, resetCalls, callsTo } from "./helpers.mjs";
import { toApiEnquiry, ENQUIRY_FIXED_FIELDS } from "../services/apiMappers.js";
import { enquiryDate } from "../services/serviceConfig.js";
import { newUserSignUpSchema } from "../validation/schemas.js";
import { MOCK_OTP_CODE } from "../services/mockApi.js";
import { toISODate } from "../utils/formatDate.js";

// What NewUserSignUpScreen submits (phone already split into dial code + national digits). Unique per call so the
// duplicate guard and the in-memory accounts don't collide between tests.
const signUp = (overrides = {}) => ({
  companyName: "  Test Holdings ",
  customerName: " Test Person ",
  activity: "702 Management consultancy activities",
  email: ` enquiry-${Math.random().toString(36).slice(2)}@example.com `,
  phoneCountry: "BH",
  countryCode: "+973",
  phoneNumber: "36123456",
  nationality: "Bahrain",
  cprNumber: "880112345",
  passportNumber: "",
  remarks: " Need a 4-desk office from November. ",
  ...overrides,
});

// Records each POST /enquiries: { method, headers, body }.
let posted = [];
const acceptEnquiry = (answer = (body) => json(JSON.stringify({ data: body }), 201)()) => (path, init) => {
  const body = JSON.parse(init.body);
  posted.push({ method: init.method, headers: init.headers, body });
  return answer(body);
};

beforeEach(() => {
  posted = [];
  resetCalls();
  setRoutes({});
  process.env.EXPO_PUBLIC_SEND_ENQUIRIES = "true";
  delete process.env.EXPO_PUBLIC_ENQUIRY_TEST_DATE;
});

// ---- payload mapping ----

test("toApiEnquiry maps the sign-up fields and adds the fixed values — nothing else", () => {
  const payload = toApiEnquiry(signUp({ email: "a@example.com" }), { date: "2026-10-05" });
  assert.deepEqual(payload, {
    date: "2026-10-05",
    company: "Test Holdings",
    ContactPerson: "Test Person",
    mobile: "0097336123456",
    email: "a@example.com",
    remarks: "Need a 4-desk office from November.",
    status: "1",
    Channel: "c",
    assigned_to: "Asad",
    ServiceType: "i",
    payment_term: "1",
  });
  assert.deepEqual(ENQUIRY_FIXED_FIELDS, { status: "1", Channel: "c", assigned_to: "Asad", ServiceType: "i", payment_term: "1" });
});

test("display labels and sensitive / app-only fields are never sent", () => {
  const keys = Object.keys(toApiEnquiry(signUp(), { date: "2026-10-05" }));
  for (const key of ["status_label", "Channel_label", "ServiceType_label", "nationality", "cprNumber", "passportNumber", "activity"]) {
    assert.ok(!keys.includes(key), key);
  }
});

test("mobile: '00' + dial code digits + national number, for any country", () => {
  assert.equal(toApiEnquiry(signUp({ countryCode: "+971", phoneNumber: "501234567" }), { date: "x" }).mobile, "00971501234567");
  assert.equal(toApiEnquiry(signUp({ countryCode: "+91", phoneNumber: "7619222336" }), { date: "x" }).mobile, "00917619222336");
});

test("remarks are optional: empty → \"\"; over 500 characters is rejected by the form", () => {
  assert.equal(toApiEnquiry(signUp({ remarks: "" }), { date: "x" }).remarks, "");
  assert.equal(toApiEnquiry(signUp({ remarks: undefined }), { date: "x" }).remarks, "");
  const form = { ...signUp({ email: "ok@example.com" }), phoneNumber: "36123456" };
  assert.equal(newUserSignUpSchema.safeParse({ ...form, remarks: "" }).success, true);
  const issues = newUserSignUpSchema.safeParse({ ...form, remarks: "x".repeat(501) }).error.issues;
  assert.deepEqual(issues.map((i) => i.path[0]), ["remarks"]);
});

test("date: today (local) by default; EXPO_PUBLIC_ENQUIRY_TEST_DATE overrides it; a malformed override is ignored", () => {
  assert.equal(enquiryDate(), toISODate(new Date()));
  process.env.EXPO_PUBLIC_ENQUIRY_TEST_DATE = "2026-10-05";
  assert.equal(enquiryDate(), "2026-10-05");
  process.env.EXPO_PUBLIC_ENQUIRY_TEST_DATE = "05/10/2026";
  assert.equal(enquiryDate(), toISODate(new Date()));
});

// ---- switched off ----

test("switched off (default): sign-up works and makes NO request", async () => {
  delete process.env.EXPO_PUBLIC_SEND_ENQUIRIES;
  assert.equal(api.areEnquiriesLive(), false);
  const result = await api.registerNewUser(signUp());
  assert.deepEqual(result.enquiry, { status: "disabled" });
  assert.deepEqual(calls, []);
});

// ---- switched on ----

test("success: one JSON POST to /enquiries with the mapped body → recorded; the demo account still verifies", async () => {
  setRoutes({ "/enquiries": acceptEnquiry() });
  const input = signUp();
  const result = await api.registerNewUser(input);

  assert.equal(result.enquiry.status, "recorded");
  assert.equal(posted.length, 1);
  assert.equal(posted[0].method, "POST");
  assert.equal(posted[0].headers["Content-Type"], "application/json");
  assert.deepEqual(posted[0].body, toApiEnquiry(input, { date: toISODate(new Date()) }));
  assert.equal(result.enquiry.enquiry.email, input.email.trim(), "MAZ's echoed record is returned");

  const verified = await api.verifyEmail({ email: result.email, code: MOCK_OTP_CODE });
  assert.equal(verified.verified, true, "the OTP flow is unchanged");
});

test("success with an empty 2xx body still counts (the status is MAZ's confirmation)", async () => {
  setRoutes({ "/enquiries": acceptEnquiry(() => new Response("", { status: 201 })) });
  const result = await api.registerNewUser(signUp());
  assert.deepEqual(result.enquiry, { status: "recorded", enquiry: null });
});

test("422 validation error → failed (VALIDATION, field names kept); the demo account is still created", async () => {
  const errors = JSON.stringify({ message: "The mobile field is required.", errors: { mobile: ["The mobile field is required."] } });
  setRoutes({ "/enquiries": acceptEnquiry(() => json(errors, 422)()) });
  const result = await api.registerNewUser(signUp());
  assert.equal(result.enquiry.status, "failed");
  assert.equal(result.enquiry.code, "VALIDATION");
  assert.doesNotMatch(result.enquiry.message, /mobile field/, "the server's wording is not shown");

  const error = await api.submitSignUpEnquiry(signUp()).catch((e) => e);
  assert.deepEqual(error.fields, ["mobile"]);
  assert.equal((await api.verifyEmail({ email: result.email, code: MOCK_OTP_CODE })).verified, true);
});

test("server error → failed SERVER; its HTML / stack trace never reaches the message", async () => {
  setRoutes({ "/enquiries": status(500) });
  const { enquiry } = await api.registerNewUser(signUp());
  assert.equal(enquiry.code, "SERVER");
  assert.doesNotMatch(enquiry.message, /Stack trace|<html>/i);
});

test("a 2xx HTML page is not a confirmation → failed INVALID_RESPONSE", async () => {
  setRoutes({ "/enquiries": acceptEnquiry(() => new Response("<html>ok</html>", { status: 200 })) });
  const { enquiry } = await api.registerNewUser(signUp());
  assert.equal(enquiry.status, "failed");
  assert.equal(enquiry.code, "INVALID_RESPONSE");
});

test("network down → failed NETWORK; 'Send again' then succeeds", async () => {
  const input = signUp();
  setRoutes({ "/enquiries": networkDown() });
  const first = await api.registerNewUser(input);
  assert.equal(first.enquiry.code, "NETWORK");

  setRoutes({ "/enquiries": acceptEnquiry() });
  const retry = await api.submitSignUpEnquiry(input);
  assert.equal(retry.status, "recorded");
  assert.equal(posted.length, 1);
});

test("timeout → failed TIMEOUT (the screen warns a resend could duplicate)", async () => {
  setRoutes({
    "/enquiries": () => {
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    },
  });
  const { enquiry } = await api.registerNewUser(signUp());
  assert.equal(enquiry.code, "TIMEOUT");
});

test("duplicates: simultaneous submits share one POST; after success the same details aren't posted again", async () => {
  setRoutes({ "/enquiries": acceptEnquiry() });
  const input = signUp();
  const [a, b] = await Promise.all([api.submitSignUpEnquiry(input), api.submitSignUpEnquiry(input)]);
  assert.equal(a.status, "recorded");
  assert.equal(b.status, "recorded");
  assert.equal(callsTo("/enquiries"), 1);

  const again = await api.submitSignUpEnquiry(input);
  assert.equal(again.duplicate, true);
  assert.equal(callsTo("/enquiries"), 1, "no second record");

  await api.submitSignUpEnquiry({ ...input, remarks: "Different remarks" });
  assert.equal(callsTo("/enquiries"), 2, "changed details are a new enquiry");
});

test("a failed attempt isn't remembered as sent", async () => {
  const input = signUp();
  setRoutes({ "/enquiries": status(503) });
  await assert.rejects(api.submitSignUpEnquiry(input), { code: "SERVER" });
  setRoutes({ "/enquiries": acceptEnquiry() });
  const result = await api.submitSignUpEnquiry(input);
  assert.equal(result.status, "recorded");
  assert.equal(result.duplicate, undefined);
});
