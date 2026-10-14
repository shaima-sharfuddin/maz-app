// The five MAZ endpoints as they answer today (checked 2026-10-10), with SYNTHETIC fixtures in MAZ's real shapes —
// no real names, contacts, CPR / passport numbers or amounts. The "sensitive" values below are obvious placeholders
// (SYNTH-…) so a test can prove they never come out of the service layer.
//   customers  — no top-level id; the id is only on owners[].customer_id; owners carry CPR / passport / contacts
//   contracts  — today's single contract belongs to ANOTHER customer than the demo login
//   units      — extra fields (status, std_rent_amt, max_cr) the app must not use
//   violations — a catalogue of TYPES ({ name: "#186 …" }), not notices
//   activities — { name: "702 …" } only, no id, no paging envelope
// Catalogues are cached for the process, and failures / empty lists aren't — so within this file the failure and
// empty-list tests run BEFORE the success tests that fill the cache.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  api,
  auth,
  contract,
  contractsBody,
  setRoutes,
  json,
  status,
  networkDown,
  resetCalls,
  callsTo,
  loginLiveCustomer,
  rejectionOf,
} from "./helpers.mjs";
import { toUiCustomer, customerIdOf, toUiCodedName } from "../services/apiMappers.js";
import { ACTIVITIES as SAMPLE_ACTIVITIES } from "../data/formOptions.js";
import { SERVICE_SOURCES } from "../services/serviceConfig.js";
import { MOCK_OTP_CODE } from "../services/mockApi.js";

// ---- synthetic fixtures ----
const SENSITIVE = ["SYNTH-CPR-0001", "SYNTH-PP-0001", "+973 0000 0001", "owner@synthetic.test", "SYNTH-CR-1"];
const owner = (customerId, n = 1) => ({
  name: `Synthetic Owner ${n}`,
  mobile: SENSITIVE[2],
  email: SENSITIVE[3],
  cpr_no: SENSITIVE[0],
  passport_no: SENSITIVE[1],
  country: "Synthland",
  gender: "m",
  type: "o",
  customer_id: customerId,
});
const customerRecord = (customerId, overrides = {}) => ({
  name: "Synthetic Trading W.L.L.",
  name_ar: "اختبار",
  email: SENSITIVE[3],
  crRegNo: SENSITIVE[4],
  company_id: 1,
  activityId: [145],
  violationId: [186],
  owners: [owner(customerId, 1), owner(customerId, 2)],
  ...overrides,
});
// Units with the extra fields MAZ returns today. 9999.999 is a deliberately odd std_rent_amt to search for.
const unitsWithExtras = () =>
  JSON.stringify({
    data: [
      { id: 10, name: "Office 204", status: "1", std_rent_amt: "9999.999", max_cr: 5, is_incubation: 0, slug: "o-204", tally_id: null },
      { id: 11, name: "INC 001", status: "3", std_rent_amt: "9999.999", max_cr: 1, is_incubation: 1, slug: "inc-001", tally_id: null },
    ],
  });
const violationsBody = () =>
  JSON.stringify({
    data: [
      { name: "#16 Synthetic signboard type" },
      { name: "#7 Synthetic approval type" },
      { name: "#186 Synthetic registration type" },
      { name: "Uncoded synthetic type" },
      { name: "  " },
      { name: "#7 Synthetic approval type" }, // duplicate
    ],
  });
const activitiesBody = () =>
  JSON.stringify({
    data: [
      { name: "702 Synthetic consultancy activities" },
      { name: "681 Synthetic real estate activities" },
      { name: "4659 Synthetic trade activities" },
      { name: "46691-1 Synthetic chemicals trade" },
      { name: "332" }, // a bare code with no words — not a usable option
      { name: "" },
      { name: "702 Synthetic consultancy activities" }, // duplicate
    ],
  });
const emptyList = () => JSON.stringify({ data: [] });

// Every test sets all routes it may touch (unrouted paths throw in the fake fetch).
const routes = (overrides = {}) =>
  setRoutes({
    "/units": json(unitsWithExtras()),
    "/violations": json(violationsBody()),
    "/activities": json(activitiesBody()),
    "/contracts": json(contractsBody()),
    "/customers": json(JSON.stringify({ data: customerRecord(1) })),
    ...overrides,
  });

// ---------------------------------------------------------------- customers

test("customers: the mapper keeps only id + name — no CPR, passport, mobile or email", () => {
  const mapped = toUiCustomer(customerRecord(3));
  assert.deepEqual(Object.keys(mapped).sort(), ["id", "name"]);
  assert.deepEqual(mapped, { id: "3", name: "Synthetic Trading W.L.L." });
  const text = JSON.stringify(mapped);
  for (const value of SENSITIVE) assert.ok(!text.includes(value), `${value} must not be mapped`);
});

test("customers: the id comes from a top-level id, else agreeing owners — never guessed", () => {
  assert.equal(customerIdOf({ id: 7, owners: [owner(3)] }), "7");
  assert.equal(customerIdOf(customerRecord(3)), "3");
  assert.equal(customerIdOf({ owners: [owner(3), owner("3")] }), "3", "number and text agree");
  assert.equal(customerIdOf({ owners: [owner(3), owner(4)] }), null, "owners disagree → unknown");
  assert.equal(customerIdOf({ owners: [] }), null);
  assert.equal(customerIdOf({}), null);
  assert.equal(toUiCustomer({ name: "   " }).name, null, "a blank name is unknown, not ''");
});

test("customers: the dashboard name is the demo customer's own — another customer's record is refused", async () => {
  await loginLiveCustomer(); // demo identity: customer 1
  routes({ "/customers": json(JSON.stringify({ data: customerRecord(1) })) });
  assert.equal(await api.fetchTenantName(), "Synthetic Trading W.L.L.");

  routes({ "/customers": json(JSON.stringify({ data: customerRecord(3, { name: "Someone Else Ltd" }) })) });
  const refused = await rejectionOf(api.fetchTenantName());
  assert.equal(refused?.code, "NOT_FOUND");

  // Today MAZ has no customer 1: a 404 (with a debug page) → a fixed NOT_FOUND message, no server text.
  routes({ "/customers": status(404) });
  const missing = await rejectionOf(api.fetchTenantName());
  assert.equal(missing?.code, "NOT_FOUND");
  assert.doesNotMatch(missing.message, /stack|trace|whoops|\/var\/www/i);
});

// ---------------------------------------------------------------- contracts

test("contracts: today's only contract belongs to customer 3 — the demo customer 1 sees none of it", async () => {
  await loginLiveCustomer();
  const others = contract({ id: 5, name: "CN-SYNTH-0005", customer_id: 3, activity_id: null, violation_id: null });
  others.receipts.forEach((receipt) => Object.assign(receipt, { customer_id: 3 }));
  routes({ "/contracts": json(contractsBody([others])) });

  const contracts = await api.fetchContracts();
  assert.deepEqual(contracts.filter((c) => !c.demo), [], "no real contract shown");
  assert.ok(!JSON.stringify(contracts).includes("CN-SYNTH-0005"));

  const dashboard = await api.fetchDashboard("tenant");
  assert.deepEqual(
    [dashboard.summary.totalCount, dashboard.summary.activeCount, dashboard.summary.expiredCount],
    [0, 0, 0]
  );
  assert.equal(dashboard.payment.total, 0);
  assert.equal((await rejectionOf(api.fetchContract("CN-SYNTH-0005")))?.code, "NOT_FOUND");
});

test("contracts: an empty dataset (total 0) is an empty state, not an error", async () => {
  await loginLiveCustomer();
  routes({
    "/contracts": json(JSON.stringify({ data: [], links: { next: null }, meta: { total: 0, last_page: 1 } })),
  });
  const contracts = await api.fetchContracts();
  assert.deepEqual(contracts.filter((c) => !c.demo), []);
  const dashboard = await api.fetchDashboard("tenant");
  assert.equal(dashboard.summary.totalCount, 0);
});

// ---------------------------------------------------------------- units

test("units: names still map; status / std_rent_amt / max_cr are never used (std_rent_amt is no price)", async () => {
  await loginLiveCustomer();
  routes();
  const [mapped] = (await api.fetchContracts()).filter((c) => !c.demo);
  assert.equal(mapped.unit, "Office 204");
  const text = JSON.stringify(mapped);
  assert.ok(!text.includes("9999.999"), "std_rent_amt must not reach a contract");
  assert.ok(!/max_cr|std_rent|maxCr|stdRent/.test(text));
});

// ---------------------------------------------------------------- activities (failures / empty BEFORE success)

test("activities: a failed, malformed or empty /activities falls back to the labelled sample list", async () => {
  for (const failing of [networkDown(), status(500), json("<html>not json</html>"), json(emptyList())]) {
    routes({ "/activities": failing });
    const result = await api.fetchActivityOptions();
    assert.equal(result.source, "sample");
    assert.deepEqual(result.options, SAMPLE_ACTIVITIES);
  }
});

test("activities: MAZ's labels replace the samples — leading codes kept, blanks and duplicates dropped, cached", async () => {
  routes();
  resetCalls();
  const [first, second] = await Promise.all([api.fetchActivityOptions(), api.fetchActivityOptions()]);
  assert.equal(first.source, "maz");
  // Alphabetical by label (the part after the code), so the long list scans naturally; codes stay in the text.
  assert.deepEqual(first.options, [
    "46691-1 Synthetic chemicals trade",
    "702 Synthetic consultancy activities",
    "681 Synthetic real estate activities",
    "4659 Synthetic trade activities",
  ]);
  assert.deepEqual(second, first);
  await api.fetchActivityOptions();
  assert.equal(callsTo("/activities"), 1, "one request for simultaneous and later calls");
});

test("activities: no customer or session needed (sign-up happens signed out)", async () => {
  auth.setCurrentSession(null);
  routes();
  assert.equal((await api.fetchActivityOptions()).source, "maz");
});

// ---------------------------------------------------------------- violation types (failure BEFORE success)

test("violation types: a failure is a clear error (no server text), and Try again recovers", async () => {
  routes({ "/violations": status(503) });
  const error = await rejectionOf(api.fetchViolationTypes());
  assert.equal(error?.code, "SERVER");
  assert.doesNotMatch(api.errorMessage(error), /stack|trace|whoops/i);

  routes({ "/violations": json(emptyList()) });
  assert.deepEqual(await api.fetchViolationTypes(), [], "empty → the screen's empty state");

  routes();
  assert.equal((await api.fetchViolationTypes()).length, 4, "empty / failed results weren't cached");
});

test("violation types: code + label split safely, sorted by code, deduplicated; uncoded names kept whole", async () => {
  routes();
  const types = await api.fetchViolationTypes();
  assert.deepEqual(
    types.map((t) => [t.code, t.label]),
    [
      ["7", "Synthetic approval type"],
      ["16", "Synthetic signboard type"],
      ["186", "Synthetic registration type"],
      [null, "Uncoded synthetic type"],
    ]
  );
  assert.deepEqual(toUiCodedName({ name: "#186 X" }), { name: "#186 X", code: "186", label: "X" });
  assert.deepEqual(toUiCodedName({ name: "46691-1 Y" }), { name: "46691-1 Y", code: "46691-1", label: "Y" });
  assert.deepEqual(toUiCodedName({ name: "332" }), { name: "332", code: null, label: "332" }, "bare code: no label to split");
});

test("violation types are a REAL catalogue; customer notices stay DEMO — never mixed", async () => {
  assert.equal(SERVICE_SOURCES.violationTypes, "real");
  assert.equal(SERVICE_SOURCES.violations, "mock");
  assert.equal(api.VIOLATION_TYPES_ARE_REAL, true);
  assert.equal(api.VIOLATIONS_ARE_DEMO, true);

  routes();
  const types = await api.fetchViolationTypes();
  for (const type of types) {
    assert.deepEqual(Object.keys(type).sort(), ["code", "label", "name"], "no fabricated status, date, fine or customer");
  }

  await loginLiveCustomer();
  const notices = await api.fetchViolations();
  assert.ok(notices.length > 0);
  assert.ok(notices.every((notice) => notice.demo === true), "every notice is labelled demo");
  const typeNames = new Set(types.map((t) => t.name));
  assert.ok(notices.every((notice) => !typeNames.has(notice.title)), "no type is presented as a notice");
});

test("violation types load without a customer; notices don't (never another customer's)", async () => {
  auth.setCurrentSession(null);
  routes();
  assert.ok((await api.fetchViolationTypes()).length > 0);
  assert.deepEqual(await api.fetchViolations(), []);
});

// ---------------------------------------------------------------- screens & navigation (source checks)

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("ViolationTypesScreen is registered in the signed-in group and reached from Violations", () => {
  const app = source("App.js");
  assert.match(app, /import ViolationTypesScreen from "\.\/screens\/ViolationTypesScreen"/);
  const signedIn = app.slice(app.indexOf('name="HomeDashboard"'));
  assert.match(signedIn, /<Stack\.Screen name="ViolationTypes" component=\{ViolationTypesScreen\} \/>/);
  const signedOut = app.slice(app.indexOf("{!isSignedIn ? ("), app.indexOf('name="HomeDashboard"'));
  assert.doesNotMatch(signedOut, /ViolationTypes/, "not reachable signed out");
  assert.match(source("screens/ViolationsScreen.js"), /navigation\.navigate\("ViolationTypes"\)/);
});

test("ViolationTypesScreen: data only via services/api, with loading / error / empty states and no fabricated fields", () => {
  const screen = source("screens/ViolationTypesScreen.js");
  assert.match(screen, /import \{ fetchViolationTypes, errorMessage \} from "\.\.\/services\/api"/);
  assert.doesNotMatch(screen, /fetch\(|httpClient|httpApi|mockApi/);
  assert.match(screen, /Skeleton/);
  assert.match(screen, /Try again/);
  assert.match(screen, /No violation types available/);
  assert.match(screen, /not notices issued to your company/);
  assert.doesNotMatch(screen, /\btypes?\.(dueDate|fine|issuedOn|status|resolvedOn|customerId|contractId)\b|StatusBadge|formatDate|formatBHD/, "no dates, fines or status");
});

test("sign-up loads Activity options through services/api", () => {
  const screen = source("screens/NewUserSignUpScreen.js");
  assert.match(screen, /import \{[^}]*\bfetchActivityOptions\b[^}]*\} from "\.\.\/services\/api"/);
  assert.doesNotMatch(screen, /fetch\(|httpApi/);
});

// ---------------------------------------------------------------- customer registration
// The login is LOCAL / DEMO. POST /customers exists but is switched off by default (customers.test.mjs): with the
// default settings sign-up stays in the app and says so.

test("registration is local: sign-up + demo verification make zero network requests", async () => {
  auth.setCurrentSession(null);
  routes();
  resetCalls();
  const email = `registration-${Math.random().toString(36).slice(2)}@example.com`;
  await api.quickSignUp({
    companyName: "Synthetic Holdings",
    customerName: "Synthetic Person",
    activity: SAMPLE_ACTIVITIES[0],
    email,
    countryCode: "+973",
    phoneCountry: "BH",
    phoneNumber: "36000000",
    nationality: "Bahrain",
    cprNumber: "000000000",
    passportNumber: "",
  });
  const result = await api.verifyEmail({ email, code: MOCK_OTP_CODE });
  assert.equal(callsTo(""), 0, "nothing sent to MAZ by default — no customer is created");
  assert.deepEqual(result, { verified: true }, "verification gives no session — signing in needs the MAZ login");
});

// The transport has TWO writes, both switched off by default: POST /enquiries and POST /customers (write-safety, enquiries
// and customers tests). There is still no PUT / PATCH / DELETE; only customerCreationService posts to /customers.
test("customer creation is a switched-off real POST; nothing else creates a customer", () => {
  assert.equal(SERVICE_SOURCES.customerRegistration, "real");
  assert.match(source("services/serviceConfig.js"), /EXPO_PUBLIC_SEND_CUSTOMERS === "true"/);
  assert.doesNotMatch(source("services/http/apiClient.js"), /method:\s*["'](PUT|PATCH|DELETE)/i);
  assert.doesNotMatch(source("services/enquiryService.js") + source("services/registrationService.js"), /\/customers/);
});

test("the sign-up Review step and VerifyAccount say registration / verification are demo only", () => {
  assert.match(source("screens/NewUserSignUpScreen.js"), /Demo registration — your details are kept in this app only/);
  assert.match(source("screens/VerifyAccountScreen.js"), /Demo verification — no email is sent and this isn&apos;t an identity check/);
});
