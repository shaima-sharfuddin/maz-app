// New User sign-up → the MAZ login (POST /register, services/registerService.js) — created only AFTER the emailed code
// is verified (registrationService.verifyAndRegister), here against the fake fetch in
// helpers.mjs (never MAZ). Field names from MAZ's example request (2026-10-14).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { api, auth, setRoutes, json, status, requests, resetCalls, callsTo, TEST_OTP_CODE } from "./helpers.mjs";
import { toApiRegister } from "../services/apiMappers.js";
import { newUserSignUpSchema } from "../validation/schemas.js";

beforeEach(() => {
  auth.setCurrentSession(null);
  setRoutes({});
  resetCalls();
  delete process.env.EXPO_PUBLIC_SEND_ENQUIRIES;
  delete process.env.EXPO_PUBLIC_SEND_CUSTOMERS;
});

const PASSWORD = "Secret1234";
const signUp = (overrides = {}) => ({
  companyName: "  Test Holdings ",
  customerName: " Test Person ",
  gender: "m",
  activities: ["702 Management consultancy activities"],
  email: ` register-${Math.random().toString(36).slice(2)}@example.com `,
  password: PASSWORD,
  phoneCountry: "BH",
  countryCode: "+973",
  phoneNumber: "36123456",
  nationality: "Bahrain",
  idType: "cpr",
  cprNumber: "880112345",
  passportNumber: "",
  remarks: "",
  ...overrides,
});

const header = (request, name) =>
  Object.entries(request.headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];

test("body: MAZ's fields from the sign-up form — only the chosen ID, phone = mobile as 00…", () => {
  const input = signUp({ email: " owner@example.com " });
  assert.deepEqual(toApiRegister(input), {
    name: "Test Holdings",
    username: "owner@example.com",
    password: PASSWORD,
    phone: "0097336123456",
    mobile: "0097336123456",
    email: "owner@example.com",
    ownername: "Test Person",
    cpr_no: "880112345",
    passport_no: null,
    country: "Bahrain",
    gender: "m",
  });
  const passport = toApiRegister(signUp({ idType: "passport", cprNumber: "", passportNumber: " P1234567 ", nationality: "Other" }));
  assert.equal(passport.cpr_no, null);
  assert.equal(passport.passport_no, "P1234567");
  assert.equal(passport.country, "Other");
});

test("Submit & verify email: only the code is emailed — no MAZ login yet", async () => {
  const result = await api.registerNewUser(signUp());
  assert.equal(result.otp.status, "sent");
  assert.deepEqual(requests.map((r) => r.path), ["/sendotp"]);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(PASSWORD), "the password isn't in the result (or the route params)");
});

test("verified code → POST /register (no token) with the sign-up details; the password goes nowhere else", async () => {
  const input = signUp();
  const { email } = await api.registerNewUser(input);
  resetCalls();
  assert.deepEqual(await api.verifyAndRegister({ email, code: TEST_OTP_CODE }), { registered: true });
  assert.deepEqual(requests.map((r) => r.path), ["/verifyotp", "/register"]);
  const register = requests[1];
  assert.equal(register.method, "POST");
  assert.equal(header(register, "Authorization"), undefined);
  assert.deepEqual(JSON.parse(register.body), toApiRegister(input));
  assert.doesNotMatch(String(requests[0].body), new RegExp(PASSWORD));

  // The details are cleared once the login exists.
  const again = await api.verifyAndRegister({ email, code: TEST_OTP_CODE }).catch((e) => e);
  assert.equal(again?.code, "SIGN_UP_EXPIRED");
});

test("wrong code → INVALID_CODE and no /register", async () => {
  const { email } = await api.registerNewUser(signUp());
  resetCalls();
  const error = await api.verifyAndRegister({ email, code: "000000" }).catch((e) => e);
  assert.equal(error?.code, "INVALID_CODE");
  assert.equal(callsTo("/register"), 0);
});

test("/register fails after the code passed → Try again retries only /register", async () => {
  const { email } = await api.registerNewUser(signUp());
  setRoutes({ "/register": status(500) });
  resetCalls();
  assert.equal((await api.verifyAndRegister({ email, code: TEST_OTP_CODE }).catch((e) => e))?.code, "SERVER");
  setRoutes({});
  assert.deepEqual(await api.verifyAndRegister({ email, code: "" }), { registered: true });
  assert.equal(callsTo("/verifyotp"), 1, "the code is checked once");
  assert.equal(callsTo("/register"), 2);
});

test("MAZ refuses the login: email taken → ACCOUNT_EXISTS, other 422 / failed body → REGISTRATION_FAILED", async () => {
  const cases = [
    [json('{"message":"taken","errors":{"username":["The username has already been taken."]}}', 422), "ACCOUNT_EXISTS"],
    [json('{"message":"taken","errors":{"email":["The email has already been taken."]}}', 422), "ACCOUNT_EXISTS"],
    [json('{"message":"bad","errors":{"gender":["The gender field is required."]}}', 422), "REGISTRATION_FAILED"],
    [json('{"status":false,"message":"no"}'), "REGISTRATION_FAILED"],
  ];
  for (const [handler, code] of cases) {
    setRoutes({});
    const { email } = await api.registerNewUser(signUp());
    setRoutes({ "/register": handler });
    const error = await api.verifyAndRegister({ email, code: TEST_OTP_CODE }).catch((e) => e);
    assert.equal(error?.code, code);
    assert.doesNotMatch(api.errorMessage(error), /already been taken|required/, "MAZ's text is never shown");
  }
});

test("no sign-up details for this email (e.g. after an app restart) → SIGN_UP_EXPIRED, nothing requested", async () => {
  await api.registerNewUser(signUp());
  resetCalls();
  const error = await api.verifyAndRegister({ email: "someone-else@example.com", code: TEST_OTP_CODE }).catch((e) => e);
  assert.equal(error?.code, "SIGN_UP_EXPIRED");
  assert.equal(requests.length, 0);
});

test("a double tap registers once", async () => {
  const { email } = await api.registerNewUser(signUp());
  resetCalls();
  await Promise.all([api.verifyAndRegister({ email, code: TEST_OTP_CODE }), api.verifyAndRegister({ email, code: TEST_OTP_CODE })]).catch(() => {});
  assert.equal(callsTo("/register"), 1);
});

test("schema: the password follows the app's rule and must be confirmed", () => {
  const form = (password, confirmPassword) => ({ ...signUp(), email: "a@example.com", password, confirmPassword });
  const messages = (values) => (newUserSignUpSchema.safeParse(values).error?.issues ?? []).map((i) => [i.path[0], i.message]);
  assert.deepEqual(messages(form(PASSWORD, PASSWORD)), []);
  assert.deepEqual(messages(form("short1", "short1")), [["password", "Use at least 8 characters"]]);
  assert.deepEqual(messages(form(PASSWORD, "Other1234")), [["confirmPassword", "Passwords don't match"]]);
  assert.deepEqual(messages(form(PASSWORD, "")), [["confirmPassword", "Confirm your password"]]);
});
