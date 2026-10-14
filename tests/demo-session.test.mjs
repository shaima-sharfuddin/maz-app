// Demo state never leaks from one person to the next on the same phone.
// - sign-out cleanup: demo payments, renewals, notifications (events + read state), enquiries and bookings are cleared
//   when the account changes or signs out (services/mock/demoSession.js) — a profile edit (same account) keeps them;
// - account isolation: office requests belong to the account that submitted them;
// - dashboard state: chosen from the session's customerId (accountStateOf), never a separate demo setting.
// Logins go through the real logIn against the fake POST /login (tests/helpers.mjs); MAZ data is only read.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { api, auth, contract, contractsBody, json, setRoutes, loginLiveCustomer } from "./helpers.mjs";
import { accountStateOf } from "../services/customerService.js";
import { getEmailOutbox, recordEmail } from "../services/mock/mockNotifications.js";
import { MOCK_ENQUIRIES } from "../data/mockEnquiries.js";
import { buildRequestSummary } from "../data/pricing.js";
import { toISODate } from "../utils/formatDate.js";

// Customer 1's contract ends in 5 days, so a (demo) renewal can be requested.
const inDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
};
setRoutes({ "/contracts": json(contractsBody([contract({ to_date: inDays(5) })])) });

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

// Everything one Existing User can leave behind in the demo features of a session.
async function leaveDemoTraces() {
  const plan = await api.preparePayment({ type: "account" });
  const paid = await api.submitPayment(plan, api.getPaymentMethods()[0].id);
  assert.equal(paid.status, "succeeded");

  await api.requestRenewal("CN-TEST-0001", { termMonths: 3 });

  const notifications = await api.fetchNotifications("tenant");
  await api.markAllNotificationsRead("tenant");
  assert.ok(notifications.length > 0);

  const { enquiryId } = await api.submitEnquiry({ category: "Other", contractId: null, subject: "Private question", message: "Mine" });
  return { paidBills: plan.bills.map((bill) => bill.number), enquiryId };
}

test("sign-out clears every session-only demo store: payments, renewals, notifications, enquiries", async () => {
  await loginLiveCustomer(1);
  const { paidBills, enquiryId } = await leaveDemoTraces();
  const contractA = await api.fetchContract("CN-TEST-0001");
  assert.ok(contractA.bills.some((bill) => paidBills.includes(bill.number) && bill.demoPaid), "paid (demo) in session A");

  recordEmail({ notificationId: "TEST-EMAIL", to: "a@example.com", subject: "s", body: "b" });
  auth.setCurrentSession(null); // sign-out
  assert.equal(getEmailOutbox().length, 0, "sign-out empties the recorded-email outbox");
  await loginLiveCustomer(1); // the next person — another login for the same customer

  const again = await api.fetchContract("CN-TEST-0001");
  assert.ok(again.bills.every((bill) => !bill.demoPaid), "no 'Paid (demo)' carried over");
  assert.equal(await api.fetchRenewal("CN-TEST-0001"), null, "no renewal request carried over");
  const notifications = await api.fetchNotifications("tenant");
  assert.ok(!notifications.some((n) => n.id.startsWith("DEMO-NTF-")), "no payment / renewal events carried over");
  assert.ok(notifications.some((n) => !n.read), "read state starts fresh");
  assert.ok(!getEmailOutbox().some((email) => email.notificationId === "TEST-EMAIL"), "no recorded email carried over");
  const enquiries = await api.fetchEnquiries("tenant");
  assert.ok(!enquiries.some((e) => e.id === enquiryId), "the previous person's enquiry is gone");
  assert.equal(enquiries.length, MOCK_ENQUIRIES.length, "back to the sample enquiries");
});

test("a meeting-room booking doesn't carry over to the next account", async () => {
  await loginLiveCustomer(1);
  const seeded = await api.fetchBookings("tenant");
  const isoDate = inDays(5);
  const { slots } = await api.fetchRoomAvailability("conference-suite", isoDate);
  const free = slots.find((slot) => slot.available);
  const booking = await api.bookMeetingRoom({ roomId: "conference-suite", date: isoDate, start: free.start, durationHours: 1, notes: "" });

  auth.setCurrentSession(null);
  await loginLiveCustomer(1);
  const bookings = await api.fetchBookings("tenant");
  assert.ok(!bookings.some((b) => b.id === booking.id));
  assert.equal(bookings.length, seeded.length);
});

test("a profile edit (same account, new session object) keeps the session's demo state", async () => {
  const session = await loginLiveCustomer(1);
  const plan = await api.preparePayment({ type: "account" });
  await api.submitPayment(plan, api.getPaymentMethods()[0].id);

  auth.setCurrentSession(auth.withUserDetails(session, { name: "Renamed" })); // AuthContext.updateUserDetails
  const updated = await api.fetchContract("CN-TEST-0001");
  assert.ok(updated.bills.some((bill) => bill.demoPaid));
});

test("a demo payment still 'processing' when the user signs out never marks bills paid for the next person", async () => {
  await loginLiveCustomer(1);
  const plan = await api.preparePayment({ type: "account" });
  const pending = api.submitPayment(plan, api.getPaymentMethods()[0].id).catch((error) => error);
  await new Promise((resolve) => setTimeout(resolve, 900)); // created, now processing
  auth.setCurrentSession(null);
  await pending;

  await loginLiveCustomer(1);
  const next = await api.fetchContract("CN-TEST-0001");
  assert.ok(next.bills.every((bill) => !bill.demoPaid));
});

test("office requests belong to the account that submitted them", async () => {
  const alice = await loginLiveCustomer(null);
  const { requestId } = await submitDemoRequest();
  assert.equal((await api.fetchRequests()).length, 1);

  auth.setCurrentSession(null);
  await loginLiveCustomer(null); // Bob
  assert.deepEqual(await api.fetchRequests(), [], "Bob sees none of Alice's requests");
  assert.equal(await api.fetchLatestRequest(), null, "Bob's dashboard shows no request card");
  const peek = await api.fetchRequestStatus(requestId);
  assert.equal(peek.summary, null, "Alice's request details aren't readable by Bob");
  await assert.rejects(api.advanceRequestStage(requestId), { code: "NOT_FOUND" });
  await assert.rejects(api.fetchRequestInvoice(requestId), { code: "NOT_FOUND" });

  // Alice logs back in (same app run) → her request is still hers.
  auth.setCurrentSession(null);
  await loginLiveCustomer(null, { username: alice.user.email });
  const mine = await api.fetchRequests();
  assert.deepEqual(mine.map((request) => request.requestId), [requestId]);
});

test("signed out: no request can be submitted or read", async () => {
  auth.setCurrentSession(null);
  await assert.rejects(submitDemoRequest(), { code: "NO_SESSION" });
  assert.deepEqual(await api.fetchRequests(), []);
  assert.equal(await api.fetchLatestRequest(), null);
});

test("dashboard state comes from the session's customerId", () => {
  assert.equal(accountStateOf({ email: "t@example.com", customerId: "1", identity: "maz" }), "tenant");
  assert.equal(accountStateOf({ email: "t@example.com", customerId: null, identity: "maz" }), "newUser");
  assert.equal(accountStateOf({}), "newUser");
  assert.equal(accountStateOf(null), "newUser");
});

test("AuthContext only restores sessions the MAZ login issued (old demo sessions → 'session expired')", () => {
  const source = readFileSync(new URL("../auth/AuthContext.js", import.meta.url), "utf8");
  assert.match(source, /const restored = restoreSession\(JSON\.parse\(saved\)\);\s*if \(!restored\) \{\s*persist\(null\);\s*setSessionExpired\(true\);/);
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
