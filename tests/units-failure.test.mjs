// /units is optional: its failure must not stop contracts from loading. (Own file = own process, so the per-run
// units cache starts empty.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { api, setRoutes, status, resetCalls, callsTo, loginLiveCustomer } from "./helpers.mjs";
import { unitWithLocation } from "../utils/formatUnit.js";

test("units fail → every contract screen still loads, with the neutral unit placeholder", async () => {
  await loginLiveCustomer();
  setRoutes({ "/units": status(500) });
  resetCalls();

  const list = (await api.fetchContracts()).filter((c) => !c.demo);
  assert.equal(list[0].id, "CN-TEST-0001");
  assert.equal(list[0].unit, null);
  assert.equal(unitWithLocation(list[0].unit, list[0].location), "Unit to be confirmed");

  const detail = await api.fetchContract("CN-TEST-0001");
  assert.equal(detail.unit, null);
  const bill = await api.fetchBill("CN-TEST-0001", "CN-TEST-0001-1");
  assert.equal(bill.number, "CN-TEST-0001-1");
  const plan = await api.preparePayment({ type: "account" });
  assert.ok(plan.amount > 0);
  const dashboard = await api.fetchDashboard("tenant");
  assert.equal(dashboard.summary.activeCount, 1);
  assert.equal(typeof (await api.fetchUnreadCount("tenant")).count, "number");
  assert.equal(callsTo("/contracts"), 1, "the contracts cache is unaffected");
});

test("units are retried on a later load once MAZ recovers", async () => {
  await loginLiveCustomer();
  setRoutes({ "/units": status(503) });
  resetCalls();
  assert.equal((await api.fetchContracts()).find((c) => !c.demo).unit, null);
  setRoutes({});
  const later = (await api.fetchContracts()).find((c) => !c.demo);
  assert.equal(later.unit, "Office 204");
  assert.equal(callsTo("/units"), 2);
  // once loaded, the list is kept for the session
  await api.fetchContracts();
  assert.equal(callsTo("/units"), 2);
});
