// New User email verification — REAL MAZ endpoints (services/otpService.js), here against the fake fetch in
// helpers.mjs (never MAZ). Shapes checked against MAZ on 2026-10-14 with requests that send no email:
// POST /sendotp { email } · POST /verifyotp { email, otp } · wrong code → 422 { "error": "Invalid OTP" }.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { api, auth, setRoutes, json, status, networkDown, requests, resetCalls, TEST_OTP_CODE } from "./helpers.mjs";

beforeEach(() => {
  setRoutes({});
  resetCalls();
  delete process.env.EXPO_PUBLIC_SEND_ENQUIRIES;
  delete process.env.EXPO_PUBLIC_SEND_CUSTOMERS;
});

const lastRequest = () => requests[requests.length - 1];

test("send: one JSON POST /sendotp { email } with no Authorization header", async () => {
  auth.setCurrentSession(null);
  assert.deepEqual(await api.sendVerificationCode("  new@example.com "), { sent: true, email: "new@example.com" });
  const request = lastRequest();
  assert.equal(request.path, "/sendotp");
  assert.equal(request.method, "POST");
  assert.deepEqual(JSON.parse(request.body), { email: "new@example.com" });
  assert.equal(request.headers.Authorization ?? request.headers.authorization, undefined);
});

test("verify: POST /verifyotp { email, otp } → verified; a wrong code → INVALID_CODE (MAZ's text never shown)", async () => {
  assert.deepEqual(await api.verifyEmail({ email: "new@example.com", code: TEST_OTP_CODE }), { verified: true });
  assert.deepEqual(JSON.parse(lastRequest().body), { email: "new@example.com", otp: TEST_OTP_CODE });

  const error = await api.verifyEmail({ email: "new@example.com", code: "000000" }).catch((e) => e);
  assert.equal(error.code, "INVALID_CODE");
  assert.doesNotMatch(error.message, /Invalid OTP/);
});

test("a 2xx whose body says it failed is not a success", async () => {
  setRoutes({ "/verifyotp": json('{"status":false,"message":"expired"}'), "/sendotp": json('{"success":false}') });
  await assert.rejects(api.verifyEmail({ email: "a@example.com", code: "111111" }), { code: "INVALID_CODE" });
  await assert.rejects(api.sendVerificationCode("a@example.com"), { code: "OTP_NOT_SENT" });
});

test("send errors: 422 → INVALID_EMAIL; 429 / 500 / network keep their codes; a 401 signs nobody out", async () => {
  const cases = [
    [json('{"message":"The email field must be a valid email address."}', 422), "INVALID_EMAIL"],
    [status(429), "RATE_LIMITED"],
    [status(500), "SERVER"],
    [networkDown(), "NETWORK"],
    [status(401), "NOT_AUTHORIZED"],
  ];
  for (const [handler, code] of cases) {
    setRoutes({ "/sendotp": handler });
    await assert.rejects(api.sendVerificationCode("a@example.com"), { code });
  }
});

test("sign-up emails the code; if MAZ can't send it, sign-up still continues (VerifyAccount offers Resend)", async () => {
  const signUp = {
    companyName: "Test Holdings",
    customerName: "Test Person",
    email: `otp-${Math.random().toString(36).slice(2)}@example.com`,
    countryCode: "+973",
    phoneCountry: "BH",
    phoneNumber: "36123456",
    nationality: "Bahrain",
    idType: "cpr",
    cprNumber: "880112345",
    passportNumber: "",
  };
  const ok = await api.registerNewUser(signUp);
  assert.deepEqual(ok.otp, { status: "sent" });
  assert.equal(requests.filter((r) => r.path === "/sendotp").length, 1);

  setRoutes({ "/sendotp": status(500) });
  const failed = await api.registerNewUser({ ...signUp, email: `x-${signUp.email}` });
  assert.equal(failed.otp.status, "failed");
  assert.equal(failed.otp.code, "SERVER");
  assert.ok(failed.email, "the sign-up itself still succeeded");
});
