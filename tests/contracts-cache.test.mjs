// The 60-second contracts cache under failure: merge, reuse, expiry, failure not cached, retry, session isolation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { api, auth, setRoutes, status, networkDown, resetCalls, callsTo, loginLiveCustomer, rejectionOf } from "./helpers.mjs";

const withClock = async (offsetMs, fn) => {
  const realNow = Date.now;
  Date.now = () => realNow() + offsetMs;
  try {
    return await fn();
  } finally {
    Date.now = realNow;
  }
};

test("simultaneous loads share one /contracts request", async () => {
  await loginLiveCustomer();
  setRoutes({});
  resetCalls();
  await Promise.all([api.fetchContracts(), api.fetchDashboard("tenant", { withUnits: false }), api.fetchUnreadCount("tenant")]);
  assert.equal(callsTo("/contracts"), 1);
});

test("reused within 60 s, downloaded again after", async () => {
  await loginLiveCustomer();
  setRoutes({});
  resetCalls();
  await api.fetchContracts();
  await withClock(59_000, () => api.fetchContracts());
  assert.equal(callsTo("/contracts"), 1);
  await withClock(61_000, () => api.fetchContracts());
  assert.equal(callsTo("/contracts"), 2);
});

test("a failure is not cached — Retry makes exactly one new request and succeeds", async () => {
  await loginLiveCustomer();
  setRoutes({ "/contracts": status(503) });
  resetCalls();
  assert.equal((await rejectionOf(api.fetchContracts()))?.code, "SERVER");
  setRoutes({});
  const list = await api.fetchContracts();
  assert.ok(list.length > 0);
  assert.equal(callsTo("/contracts"), 2);
});

test("offline with fresh cache → served from cache; offline after expiry → a clear NETWORK error", async () => {
  await loginLiveCustomer();
  setRoutes({});
  await api.fetchContracts();
  setRoutes({ "/contracts": networkDown() });
  const cached = await api.fetchContract("CN-TEST-0001");
  assert.equal(cached.id, "CN-TEST-0001");
  // Financial data older than the cache window is not presented as current: the screen shows the error + Try again.
  const error = await withClock(61_000, () => rejectionOf(api.fetchContract("CN-TEST-0001")));
  assert.equal(error?.code, "NETWORK");
});

test("logout → no request and no cached data; a new login downloads fresh", async () => {
  await loginLiveCustomer();
  setRoutes({});
  await api.fetchContracts();
  auth.setCurrentSession(null);
  resetCalls();
  assert.equal((await rejectionOf(api.fetchContracts()))?.code, "NO_CUSTOMER");
  assert.equal(callsTo("/contracts"), 0);
  await loginLiveCustomer();
  await api.fetchContracts();
  assert.equal(callsTo("/contracts"), 1);
});

test("a different customer never sees the previous customer's cached contracts", async () => {
  await loginLiveCustomer(1);
  setRoutes({});
  assert.ok((await api.fetchContracts()).some((c) => c.id === "CN-TEST-0001"));
  await loginLiveCustomer(2); // another verified customer (an edited copy of a verified session is never verified)
  resetCalls();
  const theirs = (await api.fetchContracts()).map((c) => c.id);
  assert.equal(callsTo("/contracts"), 1, "fresh download for the new customer");
  assert.ok(!theirs.includes("CN-TEST-0001"));
  assert.ok(theirs.includes("CN-OTHER-0001"));
});
