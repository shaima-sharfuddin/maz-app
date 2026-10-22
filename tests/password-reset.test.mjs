// Forgot password (services/passwordResetService.js), against the fake fetch in helpers.mjs (never MAZ).
// The code is MAZ's REAL POST /sendotp; the save is an ASSUMED POST /resetpassword { email, otp, password,
// password_confirmation } — MAZ hasn't provided a reset endpoint yet.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { api, auth, setRoutes, json, status, networkDown, requests, resetCalls, TEST_OTP_CODE } from "./helpers.mjs";

const schemas = await import("../validation/schemas.js");

beforeEach(() => {
  setRoutes({});
  resetCalls();
  auth.setCurrentSession(null);
});

const lastRequest = () => requests[requests.length - 1];
const noAuthHeader = (request) => assert.equal(request.headers.Authorization ?? request.headers.authorization, undefined);
const PASSWORD = "NewSecret123";

test("send code: POST /sendotp { email } with no token", async () => {
  assert.deepEqual(await api.sendPasswordResetCode(" user@example.com "), { sent: true, email: "user@example.com" });
  assert.equal(lastRequest().path, "/sendotp");
  assert.deepEqual(JSON.parse(lastRequest().body), { email: "user@example.com" });
  noAuthHeader(lastRequest());
});

test("reset: POST /resetpassword { email, otp, password, password_confirmation } with no token → { reset: true }", async () => {
  setRoutes({ "/resetpassword": json('{"message":"Password updated"}') });
  assert.deepEqual(await api.resetPassword({ email: " user@example.com", code: TEST_OTP_CODE, password: PASSWORD }), { reset: true });
  const request = lastRequest();
  assert.equal(request.path, "/resetpassword");
  assert.equal(request.method, "POST");
  assert.deepEqual(JSON.parse(request.body), {
    email: "user@example.com",
    otp: TEST_OTP_CODE,
    password: PASSWORD,
    password_confirmation: PASSWORD,
  });
  noAuthHeader(request);
  assert.equal(requests.filter((r) => r.path === "/verifyotp").length, 0, "the code is not used up by /verifyotp first");
});

test("reset errors: wrong code → INVALID_CODE; no route yet → RESET_UNAVAILABLE; others keep their codes", async () => {
  const details = { email: "user@example.com", code: "000000", password: PASSWORD };
  const cases = [
    [json('{"error":"Invalid OTP"}', 422), "INVALID_CODE"],
    [json('{"message":"The otp is invalid.","errors":{"otp":["The otp is invalid."]}}', 422), "INVALID_CODE"],
    [json('{"message":"The password is too weak.","errors":{"password":["Too weak."]}}', 422), "RESET_FAILED"],
    [json('{"status":false,"error":"Invalid OTP"}'), "INVALID_CODE"],
    [json('{"success":false}'), "RESET_FAILED"],
    [status(404), "RESET_UNAVAILABLE"],
    [status(500), "SERVER"],
    [networkDown(), "NETWORK"],
    [status(401), "NOT_AUTHORIZED"],
  ];
  for (const [handler, code] of cases) {
    setRoutes({ "/resetpassword": handler });
    const error = await api.resetPassword(details).catch((e) => e);
    assert.equal(error?.code, code, `expected ${code}`);
    assert.doesNotMatch(error.message, /Invalid OTP|Stack trace/);
  }
});

test("schemas: email required; code + new password follow the app's rules and must match", () => {
  assert.equal(schemas.forgotPasswordSchema.safeParse({ email: "user@example.com" }).success, true);
  assert.equal(schemas.forgotPasswordSchema.safeParse({ email: "nope" }).success, false);

  const messages = (values) =>
    (schemas.resetPasswordSchema.safeParse(values).error?.issues ?? []).map((i) => [i.path.join("."), i.message]);
  assert.deepEqual(messages({ code: TEST_OTP_CODE, password: PASSWORD, confirmPassword: PASSWORD }), []);
  assert.deepEqual(messages({ code: TEST_OTP_CODE, password: PASSWORD, confirmPassword: "Other1234" }), [
    ["confirmPassword", "Passwords don't match"],
  ]);
  assert.deepEqual(messages({ code: "12", password: PASSWORD, confirmPassword: PASSWORD }), [["code", "Enter the 6-digit code"]]);
  assert.ok(messages({ code: TEST_OTP_CODE, password: "short", confirmPassword: "short" }).some(([path]) => path === "password"));
});
