// New User sign-up: the restored Activity field (recruiter, 2026-10-10). Required, one choice from MAZ's
// GET /activities labels (or the SAMPLE ACTIVITIES fallback — see api-integrations.test.mjs); kept in the local sign-up and the office / CR request — all mock,
// in memory, never sent to MAZ. (Screens can't be rendered in these Node tests: the dropdown and moving between
// steps are checked by hand — see CLAUDE.md.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { api, resetCalls, callsTo, loginLiveCustomer } from "./helpers.mjs";
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

// The options load at runtime (MAZ's GET /activities, or the samples), so the dropdown limits the choice; the
// schema accepts any present, sane label — e.g. MAZ's coded labels — and rejects an absurd one.
test("a MAZ activity label (with its leading code) is accepted; an absurdly long value is not", () => {
  assert.deepEqual(activityIssues(form({ activity: "702 Management consultancy activities" })), []);
  const issues = activityIssues(form({ activity: "x".repeat(201) }));
  assert.equal(issues.length, 1);
  assert.equal(issues[0].message, "Select an activity from the list");
});

test("changing the activity: the form keeps whichever option was picked last", () => {
  const values = form({ activity: ACTIVITIES[0] });
  values.activity = ACTIVITIES[1];
  const parsed = newUserSignUpSchema.parse(values);
  assert.equal(parsed.activity, ACTIVITIES[1]);
});

test("sign-up → OTP keeps the sign-up local; a MAZ login carries no activity (the field is app-only)", async () => {
  const values = form();
  const { email } = await api.quickSignUp(signUpPayload(values));
  assert.deepEqual(await api.verifyEmail({ email, code: MOCK_OTP_CODE }), { verified: true });

  const session = await loginLiveCustomer(null);
  assert.equal(session.user.activity, null);
  assert.equal(session.user.customerId, null, "a MAZ login without customer_id is a New User");
});

test("the office / CR request stores the activity it is given", async () => {
  const session = await loginLiveCustomer(null);
  const { user } = session;

  // What ReviewRequestScreen sends.
  const { requestId } = await api.submitRequest({
    fullName: user.name,
    email: user.email,
    companyName: user.companyName,
    activity: ACTIVITIES[0],
    remark: "",
    termMonths: 6,
    paymentFrequency: "12",
    summary: buildRequestSummary("CR Registration", 6, "12"),
  });
  const status = await api.fetchRequestStatus(requestId);
  assert.equal(status.activity, ACTIVITIES[0]);
});

test("sign-up and verification make no network request (nothing is sent to MAZ)", async () => {
  resetCalls();
  const { email } = await api.quickSignUp(signUpPayload(form()));
  await api.verifyEmail({ email, code: MOCK_OTP_CODE });
  assert.equal(callsTo(""), 0);
});
