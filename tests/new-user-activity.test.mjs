// New User sign-up: Gender and Activities. Activities (restored by the recruiter 2026-10-10, multiple choice since
// 2026-10-14): at least one, no upper limit, from MAZ's GET /activities labels (or the SAMPLE ACTIVITIES fallback — see
// api-integrations.test.mjs); kept in the local sign-up and the office / CR request — all mock, in memory, never sent to
// MAZ. Gender: required, MAZ's GENDER code ("m" / "f"). (Screens can't be rendered in these Node tests: the dropdown and
// moving between steps are checked by hand — see CLAUDE.md.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { api, resetCalls, callsTo, loginLiveCustomer, TEST_OTP_CODE } from "./helpers.mjs";
import { newUserSignUpSchema } from "../validation/schemas.js";
import { ACTIVITIES, GENDER_OPTIONS } from "../data/formOptions.js";
import { buildRequestSummary } from "../data/pricing.js";

// A sign-up form that passes every rule; `email` unique per test so the in-memory accounts don't collide.
const form = (overrides = {}) => ({
  companyName: "Test Holdings",
  customerName: "Test Person",
  gender: "m",
  activities: [ACTIVITIES[3]],
  email: `activity-${Math.random().toString(36).slice(2)}@example.com`,
  phoneCountry: "BH",
  phoneNumber: "36123456",
  nationality: "Bahrain",
  idType: "cpr",
  cprNumber: "880112345",
  passportNumber: "",
  ...overrides,
});

const issuesFor = (field, values) =>
  (newUserSignUpSchema.safeParse(values).error?.issues ?? []).filter((issue) => issue.path[0] === field);

// The payload NewUserSignUpScreen sends (phone split into dial code + number).
const signUpPayload = (values) => ({ ...values, countryCode: "+973" });

test("the sample options are listed and each one is accepted", () => {
  assert.ok(ACTIVITIES.length > 0);
  assert.equal(new Set(ACTIVITIES).size, ACTIVITIES.length, "no duplicate options");
  for (const activity of ACTIVITIES) {
    assert.deepEqual(issuesFor("activities", form({ activities: [activity] })), [], activity);
  }
  assert.equal(newUserSignUpSchema.safeParse(form()).success, true);
});

test("at least one activity is required", () => {
  const issues = issuesFor("activities", form({ activities: [] }));
  assert.equal(issues.length, 1);
  assert.equal(issues[0].message, "Select at least one activity");
});

test("several activities are accepted (no upper limit) and kept in the order they were picked", () => {
  const picked = [ACTIVITIES[2], ACTIVITIES[0], "702 Management consultancy activities", ...ACTIVITIES.slice(4)];
  const parsed = newUserSignUpSchema.parse(form({ activities: picked }));
  assert.deepEqual(parsed.activities, picked);
});

// The options load at runtime (MAZ's GET /activities, or the samples), so the dropdown limits the choice; the
// schema accepts any present, sane label — e.g. MAZ's coded labels — and rejects an absurd one.
test("an absurdly long or empty activity label is rejected", () => {
  for (const bad of ["x".repeat(201), ""]) {
    const issues = issuesFor("activities", form({ activities: [ACTIVITIES[0], bad] }));
    assert.equal(issues.length, 1);
    assert.equal(issues[0].message, "Select activities from the list");
  }
});

test("Gender is required and stores MAZ's code", () => {
  assert.deepEqual(GENDER_OPTIONS, [
    { value: "m", label: "Male" },
    { value: "f", label: "Female" },
  ]);
  for (const { value } of GENDER_OPTIONS) assert.deepEqual(issuesFor("gender", form({ gender: value })), []);
  const issues = issuesFor("gender", form({ gender: "" }));
  assert.equal(issues.length, 1);
  assert.equal(issues[0].message, "Select gender");
});

test("ID type is required; CPR or passport can be given for ANY nationality", () => {
  const idIssues = (values) =>
    (newUserSignUpSchema.safeParse(values).error?.issues ?? []).filter((issue) =>
      ["idType", "cprNumber", "passportNumber"].includes(issue.path[0])
    );
  assert.equal(idIssues(form({ idType: "" }))[0].message, "Select id type");
  // CPR for a non-Bahraini, passport for a Bahraini — both fine.
  assert.deepEqual(idIssues(form({ nationality: "Saudi Arabia", idType: "cpr", cprNumber: "880112345" })), []);
  assert.deepEqual(idIssues(form({ nationality: "Bahrain", idType: "passport", cprNumber: "", passportNumber: "P1234567" })), []);
  // The chosen ID's number is required (and the CPR keeps its 9-digit rule); the other one isn't.
  const noPassport = idIssues(form({ idType: "passport", cprNumber: "", passportNumber: " " }));
  assert.deepEqual(noPassport.map((i) => [i.path[0], i.message]), [["passportNumber", "Passport Number is required"]]);
  assert.deepEqual(idIssues(form({ idType: "cpr", cprNumber: "" })).map((i) => i.message), ["CPR Number is required"]);
  assert.deepEqual(idIssues(form({ idType: "cpr", cprNumber: "123" })).map((i) => i.message), ["CPR number must be exactly 9 digits"]);
});

test("sign-up → OTP keeps the sign-up local; a MAZ login carries no activities (the field is app-only)", async () => {
  const values = form();
  const { email } = await api.quickSignUp(signUpPayload(values));
  assert.deepEqual(await api.verifyEmail({ email, code: TEST_OTP_CODE }), { verified: true });

  const session = await loginLiveCustomer(null);
  assert.equal(session.user.activities, null);
  assert.equal(session.user.customerId, null, "a MAZ login without customer_id is a New User");
});

test("the office / CR request stores the activities it is given", async () => {
  const session = await loginLiveCustomer(null);
  const { user } = session;

  // What ReviewRequestScreen sends.
  const { requestId } = await api.submitRequest({
    fullName: user.name,
    email: user.email,
    companyName: user.companyName,
    activities: [ACTIVITIES[0], ACTIVITIES[1]],
    remark: "",
    termMonths: 6,
    summary: buildRequestSummary("CR Registration", 6),
  });
  const status = await api.fetchRequestStatus(requestId);
  assert.deepEqual(status.activities, [ACTIVITIES[0], ACTIVITIES[1]]);
});

test("sign-up and verification send no customer data to MAZ (only the email-verification calls)", async () => {
  resetCalls();
  const { email } = await api.quickSignUp(signUpPayload(form()));
  await api.verifyEmail({ email, code: TEST_OTP_CODE });
  assert.equal(callsTo(""), callsTo("/verifyotp"), "the only request is the code check");
});
