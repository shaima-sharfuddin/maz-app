// The signed-in app is a stack whose first screen is MainTabs (the custom bottom tab bar). utils/navigation.js routes
// tab destinations through MainTabs so every existing navigate / reset keeps working.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAIN_TABS, TAB_ROUTES, homeRoute, navigateTo, goHome, isTabRoot } from "../utils/navigation.js";

const fakeNavigation = (type = "stack") => {
  const calls = [];
  return {
    calls,
    navigate: (...args) => calls.push(["navigate", ...args]),
    popTo: (...args) => calls.push(["popTo", ...args]),
    getState: () => ({ type }),
  };
};

test("tab routes are reached through MainTabs; other screens directly", () => {
  const nav = fakeNavigation();
  navigateTo(nav, "Settings", { profileUpdated: true });
  navigateTo(nav, "ContractDetail", { contractId: "CN-1" });
  assert.deepEqual(nav.calls, [
    ["navigate", MAIN_TABS, { screen: "Settings", params: { profileUpdated: true } }],
    ["navigate", "ContractDetail", { contractId: "CN-1" }],
  ]);
});

test("home: reset route opens the Home tab; goHome pops back to it", () => {
  assert.deepEqual(homeRoute(), { name: MAIN_TABS, state: { routes: [{ name: "HomeDashboard" }] } });
  const nav = fakeNavigation();
  goHome(nav);
  assert.deepEqual(nav.calls, [["popTo", MAIN_TABS, { screen: "HomeDashboard" }]]);
});

test("Back buttons hide only on tab roots", () => {
  assert.equal(isTabRoot(fakeNavigation("tab")), true);
  assert.equal(isTabRoot(fakeNavigation("stack")), false);
});

test("App.js registers every tab route in MainTabs and none of them on the signed-in stack", () => {
  const app = readFileSync(new URL("../App.js", import.meta.url), "utf8");
  for (const name of TAB_ROUTES) assert.match(app, new RegExp(`<Tab\\.Screen\\s+name="${name}"`), name);
  const signedIn = app.slice(app.indexOf(`name={MAIN_TABS}`));
  for (const name of TAB_ROUTES.filter((n) => n !== "Settings")) {
    assert.doesNotMatch(signedIn, new RegExp(`<Stack.Screen name="${name}"`), name);
  }
  assert.doesNotMatch(app, /MeetingRooms|BookMeetingRoom/, "Meeting Rooms is unregistered");
  // No screen still resets to (or pops to) the old root route.
  for (const file of ["PaymentReviewScreen", "PaymentScreen", "PaymentReceiptScreen", "NewEnquiryScreen", "RequestStatusScreen"]) {
    const src = readFileSync(new URL(`../screens/${file}.js`, import.meta.url), "utf8");
    assert.doesNotMatch(src, /name: "HomeDashboard"|popToTop\(/, file);
  }
});
