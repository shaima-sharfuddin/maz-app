// Security boundary (2026-10-10): no session can load MAZ's LIVE customer data unless a genuine authentication mechanism
// verified it (services/liveAuth.js). services/httpApi.js refuses customer data (NO_CUSTOMER) before any request unless
// customerService.customerDataSource() is "live". In this file the test loader swaps in a FAKE verifier
// (tests/fixtures/fakeLiveAuth.mjs) that verifies only the sessions it issued — so everything else here proves that
// configuration, labels and hand-built sessions never count. tests/live-config-boundary.test.mjs checks the app's own
// verifier (no swap): nothing is ever live.
// The demo tenant's contracts, bills, payments and renewals run on SAMPLE data (services/mock/mockTenantContracts.js).
// Every check counts the requests the fake fetch saw (tests/helpers.mjs) — a refused call must make none.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { api, auth, calls, loginDemoTenant, loginLiveCustomer } from "./helpers.mjs";
import * as httpApi from "../services/httpApi.js";
import { customerDataSource } from "../services/customerService.js";
import { SERVICE_SOURCES } from "../services/serviceConfig.js";
import { issueVerifiedLiveSession } from "./fixtures/fakeLiveAuth.mjs";
import { MOCK_OTP_CODE } from "../services/mockApi.js";

// Every customer-specific read of the live API code, called DIRECTLY (bypassing the services that route around it).
const LIVE_CUSTOMER_READS = {
  fetchCustomerContracts: () => httpApi.fetchCustomerContracts(),
  fetchContract: () => httpApi.fetchContract("CN-TEST-0001"),
  fetchBill: () => httpApi.fetchBill("CN-TEST-0001", "CN-TEST-0001-1"),
  fetchCustomer: () => httpApi.fetchCustomer(),
  "fetchCustomer(1)": () => httpApi.fetchCustomer(1),
};

async function assertNoLiveCustomerData(label) {
  const before = calls.length;
  for (const [name, read] of Object.entries(LIVE_CUSTOMER_READS)) {
    await assert.rejects(read(), { code: "NO_CUSTOMER" }, `${label}: httpApi.${name} must refuse`);
  }
  assert.equal(calls.length, before, `${label}: not a single request to MAZ`);
}

async function signUpNewUser() {
  const email = `boundary.${Math.random().toString(36).slice(2)}@example.com`;
  await api.quickSignUp({
    companyName: "B Co", customerName: "B", activity: null, email, countryCode: "+973", phoneNumber: "36123456",
    phoneCountry: "BH", nationality: "Bahrain", cprNumber: "880112345", passportNumber: "",
  });
  const { session } = await api.verifyEmail({ email, code: MOCK_OTP_CODE });
  return { token: session.token, user: { ...session.user, customerId: null } };
}

test("a New User demo session can't request customer-specific live data", async () => {
  const session = await signUpNewUser();
  auth.setCurrentSession(session);
  assert.equal(customerDataSource(), null);
  await assertNoLiveCustomerData("New User");

  // Even with a customer id forced onto it (both identity values).
  for (const identity of ["newUser", "demoTenant"]) {
    auth.setCurrentSession({ ...session, user: { ...session.user, customerId: 1, identity } });
    assert.equal(customerDataSource(), null);
    await assertNoLiveCustomerData(`New User + customer 1 (${identity})`);
  }
});

test("the mock demo tenant can't request customer-specific live data — whatever customer id it carries", async () => {
  const session = await loginDemoTenant();
  assert.equal(customerDataSource(), "demo");
  await assertNoLiveCustomerData("demo tenant");
  for (const customerId of [3, "3", 4]) {
    auth.setCurrentSession({ ...session, user: { ...session.user, customerId } });
    await assertNoLiveCustomerData(`demo tenant with customer ${customerId}`);
  }
});

test("demo contracts, bills, payments and renewals work on sample data — with zero requests to MAZ", async () => {
  await loginDemoTenant();
  const before = calls.length;

  const dashboard = await api.fetchDashboard("tenant");
  assert.deepEqual(
    { total: dashboard.summary.totalCount, active: dashboard.summary.activeCount, expired: dashboard.summary.expiredCount },
    { total: 3, active: 2, expired: 1 }
  );
  assert.ok(dashboard.expiringSoon.some((item) => item.contractId === "DEMO-RENEWAL-001"), "renewal demo alert");
  assert.equal(dashboard.payment.due, 900, "Q2 of DEMO-CN-0001 is due");
  assert.equal(await api.fetchTenantName(), null, "no MAZ customer record — the session name is shown");

  const contract = await api.fetchContract("DEMO-CN-0001");
  assert.equal(contract.unit, "Demo Suite 204");
  assert.deepEqual(contract.bills.map((bill) => bill.status), ["paid", "unpaid", "unpaid", "unpaid"]);
  const bill = await api.fetchBill("DEMO-CN-0001", "DEMO-CN-0001-2");
  assert.equal(bill.status, "unpaid");
  await assert.rejects(api.fetchContract("CN-TEST-0001"), { code: "NOT_FOUND" }, "live contract numbers don't exist here");

  const plan = await api.preparePayment({ type: "bill", contractId: "DEMO-CN-0001", billNumber: "DEMO-CN-0001-2" });
  const paid = await api.submitPayment(plan, api.getPaymentMethods()[0].id);
  assert.equal(paid.status, "succeeded");
  const afterPayment = await api.fetchBill("DEMO-CN-0001", "DEMO-CN-0001-2");
  assert.equal(afterPayment.status, "paid");
  assert.equal(afterPayment.demoPaid, true);

  const renewal = await api.requestRenewal("DEMO-RENEWAL-001", { termMonths: 3 });
  assert.equal(renewal.status, "requested");
  const notifications = await api.fetchNotifications("tenant");
  assert.ok(notifications.find((n) => n.id === "DEMO-ACCOUNT").body.includes("sample data"));
  assert.ok(notifications.every((n) => n.basedOnRealData !== true), "nothing claims to be based on real data");

  assert.equal(calls.length, before, "the whole demo ran without a single request to MAZ");
});

test("old, forged or unsafe sessions can't load real customer data", async () => {
  const base = { token: "TKN", user: { email: "x@example.com", name: "X", companyName: null }, profileComplete: true };
  const sessions = {
    "saved before identities (customer id, no identity)": { ...base, user: { ...base.user, customerId: 1 } },
    "forged live identity while auth is mock": { ...base, user: { ...base.user, customerId: 1, identity: "maz" } },
    "unknown identity": { ...base, user: { ...base.user, customerId: 1, identity: "admin" } },
  };
  for (const [label, session] of Object.entries(sessions)) {
    auth.setCurrentSession(session);
    assert.equal(customerDataSource(), null, label);
    await assertNoLiveCustomerData(label);
    const before = calls.length;
    await assert.rejects(api.fetchContracts(), { code: "NO_CUSTOMER" }, label);
    assert.equal(calls.length, before, label);
  }

});

test("configuration alone can't unlock live data: SERVICE_SOURCES is frozen, and 'real' wouldn't count anyway", async () => {
  assert.ok(Object.isFrozen(SERVICE_SOURCES));
  assert.throws(() => {
    SERVICE_SOURCES.auth = "real";
  }, TypeError);
  assert.throws(() => {
    Object.defineProperty(SERVICE_SOURCES, "auth", { value: "real" });
  }, TypeError);
  assert.equal(SERVICE_SOURCES.auth, "mock", "unchanged");

  // Every label / token / id a session could carry, with no verification behind it.
  const base = { token: "TKN-REAL-LOOKING", user: { email: "x@example.com", name: "X", companyName: null }, profileComplete: true };
  for (const identity of ["maz", "live", "real", "demoTenant", "newUser", undefined]) {
    for (const customerId of [1, "3", 4]) {
      auth.setCurrentSession({ ...base, user: { ...base.user, customerId, identity, verified: true, authenticated: true } });
      assert.notEqual(customerDataSource(), "live", `identity ${identity}, customer ${customerId}`);
      await assertNoLiveCustomerData(`hand-built session (${identity}, ${customerId})`);
    }
  }
});

test("a verified live session can't be copied or edited into another customer's", async () => {
  const session = loginLiveCustomer(1);
  assert.equal(customerDataSource(), "live");
  assert.throws(() => {
    session.user.customerId = 2;
  }, TypeError, "the verified session is frozen");

  auth.setCurrentSession({ ...session, user: { ...session.user, customerId: 2 } }); // an edited copy
  assert.equal(customerDataSource(), null, "a copy isn't the verified session");
  await assertNoLiveCustomerData("edited copy of a verified session");

  auth.setCurrentSession(JSON.parse(JSON.stringify(session))); // e.g. one saved to and restored from storage
  assert.equal(customerDataSource(), null, "a restored copy must be re-verified by real auth, never trusted as is");
  await assertNoLiveCustomerData("restored copy of a verified session");
});

test("only a session the (test) verifier issued reaches the live API code — kept for going live", async () => {
  loginLiveCustomer(1);
  assert.equal(customerDataSource(), "live");
  const before = calls.length;
  const contracts = await api.fetchContracts();
  assert.ok(calls.length > before, "the live path does call MAZ");
  assert.ok(contracts.some((contract) => contract.id === "CN-TEST-0001"));
  assert.ok(!contracts.some((contract) => contract.demo), "no sample data mixed into live data");

  // A verified session without a customer id has no customer data either.
  auth.setCurrentSession(issueVerifiedLiveSession({ token: "T", user: { email: "n@example.com", customerId: null } }));
  await assertNoLiveCustomerData("verified session with no customer");
  auth.setCurrentSession(null);
});

test("the mock demo tenant and New Users stay blocked even when the session object is verified-looking", async () => {
  const demo = await loginDemoTenant();
  assert.equal(customerDataSource(), "demo", "demo login → sample data, not live");
  await assertNoLiveCustomerData("demo tenant");
  auth.setCurrentSession({ ...demo, user: { ...demo.user, identity: "maz" } });
  assert.equal(customerDataSource(), null);
  await assertNoLiveCustomerData("demo tenant relabelled 'maz'");
});

test("every customer-specific read in httpApi is behind the live gate", () => {
  const source = readFileSync(new URL("../services/httpApi.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /requireCurrentCustomerId|getCurrentCustomerId/, "httpApi must use requireLiveCustomerId only");
  assert.match(source, /function loadTenantRawContracts\(\) \{\s*const customerId = requireLiveCustomerId\(\);/);
  assert.match(source, /export async function fetchCustomer\(customerId\) \{\s*const liveCustomerId = requireLiveCustomerId\(\);/);
});
