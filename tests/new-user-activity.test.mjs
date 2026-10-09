// New User sign-up: the restored Activity field (recruiter, 2026-10-10). Required, one choice from the SAMPLE
// ACTIVITIES; kept through OTP verification, the session, a later login and the office / CR request — all mock,
// in memory, never sent to MAZ. (Screens can't be rendered in these Node tests: the dropdown and moving between
// steps are checked by hand — see CLAUDE.md.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { api, auth, resetCalls, callsTo } from "./helpers.mjs";
import { newUserSignUpSchema } from "../validation/schemas.js";
import { ACTIVITIES } from "../data/formOptions.js";
import { MOCK_OTP_CODE } from "../services/mockApi.js";
import { buildRequestSummary } from "../data/pricing.js";

const ACTIVITY = ACTIVITIES[3];

// A sign-up form that passes every rule; `email` unique per test so the in-memory accounts don't collide.
const form = (overrides = {}) => ({
  companyName: "Test Holdings",
  customerName: "Test Person",
  activity: ACTIVITY,
  email: `activity-${Math.random().toString(36).slice(2)}@example.com`,
  phoneCountry: "BH",
  phoneNumber: "36123456",
  nationality: "Bahrain",
  cprNumber: "880112345",
  passportNumber: "",
  ...overrides,
});

const activityIssues = (values) =>
  (newUserSignUpSchema.safeParse(values).error?.issues ?? []).filter((issue) => issue.path[0] === "activity");

// The payload NewUserSignUpScreen sends (phone split into dial code + number).
const signUpPayload = (values) => ({ ...values, countryCode: "+973" });

test("the sample options are listed and each one is accepted", () => {
  assert.ok(ACTIVITIES.length > 0);
  assert.equal(new Set(ACTIVITIES).size, ACTIVITIES.length, "no duplicate options");
  for (const activity of ACTIVITIES) {
    assert.deepEqual(activityIssues(form({ activity })), [], activity);
  }
  assert.equal(newUserSignUpSchema.safeParse(form()).success, true);
});

test("Activity is required", () => {
  const issues = activityIssues(form({ activity: "" }));
  assert.equal(issues.length, 1);
  assert.equal(issues[0].message, "Select activity");
});

test("only an option from the list is accepted", () => {
  const issues = activityIssues(form({ activity: "Something made up" }));
  assert.equal(issues.length, 1);
  assert.equal(issues[0].message, "Select an activity from the list");
});

test("changing the activity: the form keeps whichever option was picked last", () => {
  const values = form({ activity: ACTIVITIES[0] });
  values.activity = ACTIVITIES[1];
  const parsed = newUserSignUpSchema.parse(values);
  assert.equal(parsed.activity, ACTIVITIES[1]);
});

test("sign-up → OTP: the session carries the activity; a later login returns it", async () => {
  const values = form();
  const { email } = await api.quickSignUp(signUpPayload(values));

  await assert.rejects(auth.logIn({ email, password: "secret123" }), { code: "EMAIL_NOT_VERIFIED" });

  const verified = await api.verifyEmail({ email, code: MOCK_OTP_CODE });
  assert.equal(verified.session.user.activity, ACTIVITY);

  const login = await auth.logIn({ email, password: "secret123" });
  assert.equal(login.user.activity, ACTIVITY);
  assert.equal(login.user.customerId, null, "still a New User — no MAZ customer");
});

test("the office / CR request stores the signed-up user's activity", async () => {
  const { email } = await api.quickSignUp(signUpPayload(form({ activity: ACTIVITIES[0] })));
  const { session } = await api.verifyEmail({ email, code: MOCK_OTP_CODE });
  const { user } = session;

  // What ReviewRequestScreen sends.
  const { requestId } = await api.submitRequest({
    fullName: user.name,
    email: user.email,
    companyName: user.companyName,
    activity: user.activity ?? null,
    remark: "",
    termMonths: 6,
    paymentFrequency: "12",
    summary: buildRequestSummary("CR Registration", 6, "12"),
  });
  const status = await api.fetchRequestStatus(requestId);
  assert.equal(status.activity, ACTIVITIES[0]);
});

test("Existing Users (tenants) have no activity — their requests stay as before", async () => {
  const login = await auth.logIn({ email: "tenant@example.com", password: "secret123" });
  assert.equal(login.user.activity, null);
});

test("sign-up, verification and login make no network request (nothing is sent to MAZ)", async () => {
  resetCalls();
  const { email } = await api.quickSignUp(signUpPayload(form()));
  await api.verifyEmail({ email, code: MOCK_OTP_CODE });
  await auth.logIn({ email, password: "secret123" });
  assert.equal(callsTo(""), 0);
});
