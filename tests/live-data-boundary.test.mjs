// Security boundary: no session can load MAZ's customer data unless the MAZ login issued it (services/liveAuth.js —
// issueSession / restoreSession). services/httpApi.js refuses customer data (NO_CUSTOMER) before any request unless
// customerService.customerDataSource() is "live". Every check counts the requests the fake fetch saw
// (tests/helpers.mjs) — a refused call must make none.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { api, auth, calls, loginLiveCustomer } from "./helpers.mjs";
import * as httpApi from "../services/httpApi.js";
import { customerDataSource } from "../services/customerService.js";
import { SERVICE_SOURCES } from "../services/serviceConfig.js";

// Every customer-specific read of the live API code, called DIRECTLY.
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

test("signed out: no customer data", async () => {
  auth.setCurrentSession(null);
  await assertNoLiveCustomerData("signed out");
});

test("a MAZ login without customer_id (New User) can't request customer data", async () => {
  await loginLiveCustomer(null);
  assert.equal(customerDataSource(), null);
  await assertNoLiveCustomerData("New User login");
});

test("hand-built sessions never count, whatever they carry", async () => {
  const base = { token: "TKN-REAL-LOOKING", user: { email: "x@example.com", name: "X", companyName: null }, profileComplete: true };
  for (const identity of ["maz", "live", "real", "demoTenant", "newUser", undefined]) {
    for (const customerId of [1, "3", 4]) {
      auth.setCurrentSession({ ...base, user: { ...base.user, customerId, identity, verified: true } });
      assert.equal(customerDataSource(), null, `identity ${identity}, customer ${customerId}`);
      await assertNoLiveCustomerData(`hand-built session (${identity}, ${customerId})`);
      await assert.rejects(api.fetchContracts(), { code: "NO_CUSTOMER" });
    }
  }
});

test("configuration can't unlock data: SERVICE_SOURCES is frozen", () => {
  assert.ok(Object.isFrozen(SERVICE_SOURCES));
  assert.throws(() => {
    SERVICE_SOURCES.auth = "mock";
  }, TypeError);
  assert.equal(SERVICE_SOURCES.auth, "real");
});

test("a verified session can't be copied or edited into another customer's", async () => {
  const session = await loginLiveCustomer(1);
  assert.equal(customerDataSource(), "live");
  assert.throws(() => {
    session.user.customerId = "2";
  }, TypeError, "the verified session is frozen");

  auth.setCurrentSession({ ...session, user: { ...session.user, customerId: "2" } }); // an edited copy
  assert.equal(customerDataSource(), null, "a copy isn't the verified session");
  await assertNoLiveCustomerData("edited copy of a verified session");
});

test("restoring a saved session: only a MAZ session shape is restored; old demo sessions are refused", async () => {
  const session = await loginLiveCustomer(1);
  const restored = auth.restoreSession(JSON.parse(JSON.stringify(session)));
  assert.ok(restored, "a saved MAZ session is restored");
  auth.setCurrentSession(restored);
  assert.equal(customerDataSource(), "live");

  const oldSessions = {
    "demo tenant": { token: "TKN-1", user: { email: "a@example.com", customerId: 1, identity: "demoTenant" } },
    "demo new user": { token: "TKN-2", user: { email: "b@example.com", customerId: null, identity: "newUser" } },
    "no identity": { token: "TKN-3", user: { email: "c@example.com", customerId: 1 } },
    "no token": { user: { email: "d@example.com", customerId: 1, identity: "maz" } },
    "no customerId key": { token: "TKN-4", user: { email: "e@example.com", identity: "maz" } },
  };
  for (const [label, saved] of Object.entries(oldSessions)) assert.equal(auth.restoreSession(saved), null, label);
});

test("a profile edit keeps the session verified — but only the name / company change", async () => {
  const session = await loginLiveCustomer(1);
  const edited = auth.withUserDetails(session, { name: "New Name", companyName: "New Co" });
  auth.setCurrentSession(edited);
  assert.equal(customerDataSource(), "live");
  assert.equal(edited.user.name, "New Name");
  assert.equal(edited.user.customerId, session.user.customerId);
  assert.equal(edited.token, session.token);
});

test("a verified customer session reaches MAZ's contracts", async () => {
  await loginLiveCustomer(1);
  const before = calls.length;
  const contracts = await api.fetchContracts();
  assert.ok(calls.length > before, "the live path does call MAZ");
  assert.ok(contracts.some((contract) => contract.id === "CN-TEST-0001"));
  assert.ok(!contracts.some((contract) => contract.id === "CN-OTHER-0001"), "never another customer's contracts");
});

test("every customer-specific read in httpApi is behind the live gate", () => {
  const source = readFileSync(new URL("../services/httpApi.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /requireCurrentCustomerId|getCurrentCustomerId/, "httpApi must use requireLiveCustomerId only");
  assert.match(source, /function loadTenantRawContracts\(\) \{\s*const customerId = requireLiveCustomerId\(\);/);
  assert.match(source, /export async function fetchCustomer\(customerId\) \{\s*const liveCustomerId = requireLiveCustomerId\(\);/);
});
