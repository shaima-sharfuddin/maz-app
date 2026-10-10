// Phase 2 (audit 2026-10-10): demo state never leaks from one person to the next on the same phone.
// - sign-out cleanup: demo payments, renewals, notifications (events + read state), enquiries and bookings are cleared
//   when the account changes or signs out (services/mock/demoSession.js) — a profile edit (same account) keeps them;
// - account isolation: office requests belong to the demo account that submitted them;
// - session restoration: New User demo accounts are remembered across restarts, so logging in again never turns them
//   into MAZ's demo customer;
// - dashboard state: chosen from the session's customerId (accountStateOf), never a separate demo setting.
// Real MAZ data is only read through the fake fetch (tests/helpers.mjs) — nothing is ever written.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { api, auth, calls, loginDemoTenant } from "./helpers.mjs";
import { MOCK_OTP_CODE, exportDemoAccounts, onDemoAccountsChange, MAX_REMEMBERED_ACCOUNTS } from "../services/mockApi.js";
import { accountStateOf, hasSafeCustomerIdentity } from "../services/customerService.js";
import { getEmailOutbox, recordEmail } from "../services/mock/mockNotifications.js";
import { MOCK_ENQUIRIES } from "../data/mockEnquiries.js";
import { buildRequestSummary } from "../data/pricing.js";

const DEMO_CONTRACT = "DEMO-RENEWAL-001"; // demo account's expiring contract (services/mock/mockDemoContracts.js)
const uniqueEmail = (prefix) => `${prefix}.${Math.random().toString(36).slice(2)}@example.com`;

// A New User signs up, verifies and is signed in — what NewUserSignUp → VerifyAccount → AuthContext.signIn do.
async function signUpAndSignIn(name = "New Person") {
  const email = uniqueEmail("newuser");
  await api.quickSignUp({
    companyName: `${name} Co`,
    customerName: name,
    activity: "702 Management consultancy activities",
    email,
    countryCode: "+973",
    phoneNumber: "36123456",
    phoneCountry: "BH",
    nationality: "Bahrain",
    cprNumber: "880112345",
    passportNumber: "",
  });
  const { session } = await api.verifyEmail({ email, code: MOCK_OTP_CODE });
  const signedIn = { token: session.token, user: { ...session.user, customerId: null } };
  auth.setCurrentSession(signedIn);
  return signedIn;
}

const submitDemoRequest = () =>
  api.submitRequest({
    fullName: "x",
    email: "x",
    companyName: "x",
    activity: null,
    remark: "",
    termMonths: 6,
    paymentFrequency: "12",
    summary: buildRequestSummary("Office Suites", 6, "12"),
  });

// Everything one demo Existing User can leave behind in a session.
async function leaveDemoTraces() {
  const plan = await api.preparePayment({ type: "account" });
  const methodId = api.getPaymentMethods()[0].id;
  const paid = await api.submitPayment(plan, methodId);
  assert.equal(paid.status, "succeeded");

  await api.requestRenewal(DEMO_CONTRACT, { termMonths: 3 });

  const notifications = await api.fetchNotifications("tenant");
  await api.markAllNotificationsRead("tenant");
  assert.ok(notifications.length > 0);

  const { enquiryId } = await api.submitEnquiry({ category: "Other", contractId: null, subject: "Private question", message: "Mine" });
  return { paidBills: plan.bills.map((bill) => bill.number), enquiryId };
}

test("sign-out clears every session-only demo store: payments, renewals, notifications, enquiries", async () => {
  await loginDemoTenant();
  const before = calls.length;
  const { paidBills, enquiryId } = await leaveDemoTraces();
  const contract = await api.fetchContract("DEMO-CN-0001");
  assert.ok(contract.bills.some((bill) => paidBills.includes(bill.number) && bill.demoPaid), "paid (demo) in session A");

  // Session A's (never sent) event emails — e.g. its demo payment and renewal — are cleared on sign-out.
  recordEmail({ notificationId: "TEST-EMAIL", to: "a@example.com", subject: "s", body: "b" });
  assert.ok(getEmailOutbox().length >= 1);
  auth.setCurrentSession(null); // sign-out
  assert.equal(getEmailOutbox().length, 0, "sign-out empties the recorded-email outbox");
  await loginDemoTenant(); // the next person — also the demo tenant

  const again = await api.fetchContract("DEMO-CN-0001");
  assert.ok(again.bills.every((bill) => !bill.demoPaid), "no 'Paid (demo)' carried over");
  assert.equal(await api.fetchRenewal(DEMO_CONTRACT), null, "no renewal request carried over");
  const notifications = await api.fetchNotifications("tenant");
  // Recorded events (payment / renewal) have DEMO-NTF- ids; the alerts rebuilt from contract data (DUE-, EXP-) stay.
  assert.ok(!notifications.some((n) => n.id.startsWith("DEMO-NTF-")), "no payment / renewal events carried over");
  assert.ok(notifications.some((n) => !n.read), "read state starts fresh");
  assert.equal(getEmailOutbox().length, 0, "no recorded email carried over (sample-data alerts record none)");
  const enquiries = await api.fetchEnquiries("tenant");
  assert.ok(!enquiries.some((e) => e.id === enquiryId), "the previous person's enquiry is gone");
  assert.equal(enquiries.length, MOCK_ENQUIRIES.length, "back to the sample enquiries");

  // The demo tenant works entirely on sample data: not one request to MAZ in this whole test.
  assert.equal(calls.length, before);
});

test("a meeting-room booking doesn't carry over to the next account", async () => {
  await loginDemoTenant();
  const seeded = await api.fetchBookings("tenant");
  const date = new Date();
  date.setDate(date.getDate() + 5);
  const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const { slots } = await api.fetchRoomAvailability("conference-suite", isoDate);
  const free = slots.find((slot) => slot.available);
  const booking = await api.bookMeetingRoom({ roomId: "conference-suite", date: isoDate, start: free.start, durationHours: 1, notes: "" });

  auth.setCurrentSession(null);
  await loginDemoTenant();
  const bookings = await api.fetchBookings("tenant");
  assert.ok(!bookings.some((b) => b.id === booking.id));
  assert.equal(bookings.length, seeded.length);
});

test("a profile edit (same account, new session object) keeps the session's demo state", async () => {
  const session = await loginDemoTenant();
  const plan = await api.preparePayment({ type: "account" });
  await api.submitPayment(plan, api.getPaymentMethods()[0].id);

  auth.setCurrentSession({ ...session, user: { ...session.user, name: "Renamed" } }); // AuthContext.updateUserDetails
  const contract = await api.fetchContract("DEMO-CN-0001");
  assert.ok(contract.bills.some((bill) => bill.demoPaid));
});

test("a demo payment still 'processing' when the user signs out never marks bills paid for the next person", async () => {
  await loginDemoTenant();
  const plan = await api.preparePayment({ type: "account" });
  const pending = api.submitPayment(plan, api.getPaymentMethods()[0].id).catch((error) => error);
  await new Promise((resolve) => setTimeout(resolve, 900)); // created, now processing
  auth.setCurrentSession(null);
  await pending;

  await loginDemoTenant();
  const contract = await api.fetchContract("DEMO-CN-0001");
  assert.ok(contract.bills.every((bill) => !bill.demoPaid));
});

test("office requests belong to the account that submitted them", async () => {
  const alice = await signUpAndSignIn("Alice");
  const { requestId } = await submitDemoRequest();
  assert.equal((await api.fetchRequests()).length, 1);

  auth.setCurrentSession(null);
  await signUpAndSignIn("Bob");
  assert.deepEqual(await api.fetchRequests(), [], "Bob sees none of Alice's requests");
  assert.equal(await api.fetchLatestRequest(), null, "Bob's dashboard shows no request card");
  const peek = await api.fetchRequestStatus(requestId);
  assert.equal(peek.summary, null, "Alice's request details aren't readable by Bob");
  await assert.rejects(api.advanceRequestStage(requestId), { code: "NOT_FOUND" });
  await assert.rejects(api.fetchRequestInvoice(requestId), { code: "NOT_FOUND" });

  // A tenant on the same phone doesn't see it either.
  auth.setCurrentSession(null);
  await loginDemoTenant();
  assert.deepEqual(await api.fetchRequests(), []);

  // Alice logs back in (same app run) → her request is still hers.
  auth.setCurrentSession(null);
  const login = await auth.logIn({ email: alice.user.email, password: "secret123" });
  auth.setCurrentSession(login);
  const mine = await api.fetchRequests();
  assert.deepEqual(mine.map((request) => request.requestId), [requestId]);
});

test("signed out: no request can be submitted or read", async () => {
  auth.setCurrentSession(null);
  await assert.rejects(submitDemoRequest(), { code: "NO_SESSION" });
  assert.deepEqual(await api.fetchRequests(), []);
  assert.equal(await api.fetchLatestRequest(), null);
});

test("after a restart, a remembered New User still logs in as a New User — never MAZ's demo customer", async () => {
  const email = uniqueEmail("restored");
  // Before: an email this app run doesn't know is the demo tenant (customer 1) — what used to happen after a restart.
  const unknown = await auth.logIn({ email, password: "x" });
  assert.equal(unknown.user.customerId, 1);

  // What AuthContext restores at launch from SecureStore (maz.demoAccounts).
  auth.restoreDemoAccounts([
    { email, name: "Rana", companyName: "Rana Trading", activity: "702 Management consultancy activities", verified: true, profileComplete: true },
  ]);
  const login = await auth.logIn({ email: email.toUpperCase(), password: "x" });
  assert.equal(login.user.customerId, null, "New User — no MAZ customer");
  assert.equal(login.user.name, "Rana");
  assert.equal(login.user.companyName, "Rana Trading");
  auth.setCurrentSession(login);
  assert.equal(accountStateOf(login.user), "newUser");
  await assert.rejects(api.fetchContracts(), { code: "NO_CUSTOMER" }, "no customer → no contract data at all");
});

test("a restored account that never verified still has to verify", async () => {
  const email = uniqueEmail("unverified");
  auth.restoreDemoAccounts([{ email, name: "Sam", companyName: null, activity: null, verified: false }]);
  await assert.rejects(auth.logIn({ email, password: "x" }), { code: "EMAIL_NOT_VERIFIED" });
});

test("a restored New User session (saved before accounts were remembered) is remembered for the next login", async () => {
  const email = uniqueEmail("oldsession");
  auth.rememberDemoAccount({ email, name: "Old Session", companyName: "Old Co", customerId: null });
  const login = await auth.logIn({ email, password: "x" });
  assert.equal(login.user.customerId, null);
  assert.equal(login.user.name, "Old Session");
});

test("remembered accounts hold no sensitive data, are capped, and are saved after each change", async () => {
  const saved = [];
  const stop = onDemoAccountsChange((accounts) => saved.push(accounts));
  const { user } = await signUpAndSignIn("Private Person");
  stop();
  assert.ok(saved.length >= 2, "saved after sign-up and after verification");

  const record = exportDemoAccounts().find((account) => account.email === user.email);
  assert.deepEqual(Object.keys(record).sort(), ["activity", "companyName", "email", "name", "profileComplete", "verified"]);
  assert.equal(record.verified, true);
  assert.doesNotMatch(JSON.stringify(exportDemoAccounts()), /880112345|36123456|Bahrain/, "no CPR, mobile or nationality");

  for (let i = 0; i < MAX_REMEMBERED_ACCOUNTS + 3; i += 1) await api.quickSignUp({
    companyName: "C", customerName: `P${i}`, activity: null, email: uniqueEmail(`cap${i}`), countryCode: "+973",
    phoneNumber: "36123456", phoneCountry: "BH", nationality: "Bahrain", cprNumber: "880112345", passportNumber: "",
  });
  assert.equal(exportDemoAccounts().length, MAX_REMEMBERED_ACCOUNTS);
});

test("dashboard state comes from the session's customerId — and only a trusted identity may carry one", () => {
  const tenant = (overrides = {}) => ({ email: "t@example.com", customerId: 1, identity: "demoTenant", ...overrides });
  assert.equal(accountStateOf(tenant()), "tenant");
  assert.equal(accountStateOf(tenant({ customerId: "3" })), "tenant");
  assert.equal(accountStateOf(tenant({ customerId: null })), "newUser");
  assert.equal(accountStateOf({ customerId: 1 }), "newUser", "no identity (a pre-2026-10-10 session) → no customer data");
  assert.equal(accountStateOf(tenant({ identity: "newUser" })), "newUser");
  assert.equal(accountStateOf({}), "newUser");
  assert.equal(accountStateOf(null), "newUser");
});

// The shape AuthContext saved before identities existed: a customer id but no identity. It might be a New User who
// logged in after a restart and was given the demo customer — so it may never load MAZ data.
test("an old saved session (customer id, no identity) can't load contracts, bills or the customer record", async () => {
  const old = { token: "TKN-OLD", user: { email: uniqueEmail("old"), name: "Old", companyName: null, customerId: 1 }, profileComplete: true };
  assert.equal(hasSafeCustomerIdentity(old.user), false, "AuthContext discards it at launch (→ Login, 'session expired')");

  auth.setCurrentSession(old);
  const before = calls.length;
  await assert.rejects(api.fetchContracts(), { code: "NO_CUSTOMER" });
  await assert.rejects(api.fetchContract("CN-TEST-0001"), { code: "NO_CUSTOMER" });
  await assert.rejects(api.fetchBill("CN-TEST-0001", "CN-TEST-0001-1"), { code: "NO_CUSTOMER" });
  await assert.rejects(api.fetchCustomer(), { code: "NO_CUSTOMER" });
  await assert.rejects(api.preparePayment({ type: "account" }), { code: "NO_CUSTOMER" });
  assert.deepEqual(await api.fetchNotifications("tenant"), []);
  assert.equal(calls.length, before, "not a single request to MAZ");

  const restore = readFileSync(new URL("../auth/AuthContext.js", import.meta.url), "utf8");
  assert.match(restore, /customerId != null && !hasSafeCustomerIdentity\(parsed\.user\)\) \{\s*persist\(null\);\s*setSessionExpired\(true\);/);
});

test("a New User session can never load MAZ customer data — even if a customer id reached it", async () => {
  const { user } = await signUpAndSignIn("Nadia");
  assert.equal(user.identity, "newUser");
  assert.equal(user.customerId, null);

  for (const forged of [
    { ...user, customerId: 1 }, // identity says New User
    { ...user, customerId: 3, identity: "demoTenant" }, // identity forged, but the email is a New User demo account
  ]) {
    auth.setCurrentSession({ token: "TKN", user: forged });
    const before = calls.length;
    assert.equal(accountStateOf(forged), "newUser");
    await assert.rejects(api.fetchContracts(), { code: "NO_CUSTOMER" });
    await assert.rejects(api.fetchContract("DEMO-RENEWAL-001"), { code: "NO_CUSTOMER" }, "not even the demo contract");
    await assert.rejects(api.fetchCustomer(), { code: "NO_CUSTOMER" });
    await assert.rejects(api.fetchDashboard("tenant"), { code: "NO_CUSTOMER" });
    assert.equal(calls.length, before, "no request to MAZ");
  }

  // Logging in again always gives the New User identity, never customer 1.
  auth.setCurrentSession(null);
  const login = await auth.logIn({ email: user.email, password: "x" });
  assert.equal(login.user.customerId, null);
  assert.equal(login.user.identity, "newUser");
});

test("the demo tenant (recruiter testing) still works, and is marked as the demo identity", async () => {
  const session = await loginDemoTenant();
  assert.equal(session.user.identity, "demoTenant");
  assert.equal(session.user.customerId, 1);
  assert.equal(accountStateOf(session.user), "tenant");
  const before = calls.length;
  const contracts = await api.fetchContracts();
  assert.deepEqual(contracts.map((contract) => contract.id).sort(), ["DEMO-CN-0001", "DEMO-CN-0002", "DEMO-RENEWAL-001"]);
  assert.ok(contracts.every((contract) => contract.demo), "every contract is labelled demo");
  assert.equal(calls.length, before, "sample data — no request to MAZ");
});

test("no screen reads a separate demo toggle for the account type", () => {
  const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  for (const screen of [
    "HomeDashboardScreen",
    "MeetingRoomsScreen",
    "NewEnquiryScreen",
    "NotificationsScreen",
    "SupportScreen",
    "ViolationsScreen",
    "SettingsScreen",
  ]) {
    const code = read(`screens/${screen}.js`);
    assert.doesNotMatch(code, /userState\s*}\s*=\s*useDemo\(\)/, `${screen} must not read userState from useDemo`);
    assert.match(code, /useAccountState\(\)/, `${screen} must use useAccountState()`);
  }
  for (const screen of ["LoginScreen", "VerifyAccountScreen"]) assert.doesNotMatch(read(`screens/${screen}.js`), /setUserState/);
  assert.doesNotMatch(read("demo/DemoContext.js"), /userState/);
});
