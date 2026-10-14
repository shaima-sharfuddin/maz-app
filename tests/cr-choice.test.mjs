// Office Suites → "I have a CR" / "I need a new CR" (CommercialRegistrationScreen) before Term & payments. An existing
// CR needs a valid CR number; a new CR adds the (sample) CR registration fee to the first invoice. All mock.
import { test } from "node:test";
import assert from "node:assert/strict";
import { api, loginLiveCustomer } from "./helpers.mjs";
import { crChoiceSchema } from "../validation/schemas.js";
import {
  CR_REGISTRATION_FEE_BHD,
  PLACEHOLDER_DEPOSIT_BHD,
  buildRequestSummary,
  crLabel,
  firstInvoice,
  formatBHD,
} from "../data/pricing.js";
import { SERVICES, BROWSE_PLAN_IDS } from "../data/brand.js";
import { planRoute } from "../utils/openPlan.js";

const crIssues = (values) => (crChoiceSchema.safeParse(values).error?.issues ?? []).map((i) => [i.path[0], i.message]);

test("an answer is required; an existing CR needs a valid CR number, a new CR none", () => {
  assert.deepEqual(crIssues({ crOption: "", crNumber: "" }), [["crOption", "Choose an option"]]);
  assert.deepEqual(crIssues({ crOption: "existing", crNumber: "" }), [["crNumber", "CR Number is required"]]);
  assert.deepEqual(crIssues({ crOption: "existing", crNumber: "12ab" }), [["crNumber", "Enter a CR number like 123456-1"]]);
  assert.deepEqual(crIssues({ crOption: "existing", crNumber: "123456-1" }), []);
  assert.deepEqual(crIssues({ crOption: "new", crNumber: "" }), []);
});

test("first invoice: a new CR adds the CR registration fee; an existing CR doesn't", () => {
  const plain = firstInvoice(6);
  assert.equal(plain.crFee, 0);
  assert.equal(plain.total, 600 + PLACEHOLDER_DEPOSIT_BHD);
  const withCr = firstInvoice(6, { newCr: true });
  assert.equal(CR_REGISTRATION_FEE_BHD, 100);
  assert.equal(withCr.crFee, CR_REGISTRATION_FEE_BHD);
  assert.equal(withCr.total, plain.total + CR_REGISTRATION_FEE_BHD);
});

test("request summary: CR row, and the fee only for a new CR", () => {
  const existing = buildRequestSummary("Office Suites", 6, { option: "existing", number: "123456-1" });
  assert.equal(existing.cr, "Existing CR · 123456-1");
  assert.equal(existing.crFee, null);
  const fresh = buildRequestSummary("Office Suites", 6, { option: "new", number: null });
  assert.equal(fresh.cr, "New CR registration");
  assert.equal(fresh.crFee, formatBHD(100));
  assert.equal(fresh.firstInvoiceTotal, formatBHD(800));
  assert.equal(crLabel(null), null);
  assert.equal(buildRequestSummary("CR Registration", 6).cr, null);
});

async function invoiceFor(cr) {
  await loginLiveCustomer(null);
  const { requestId } = await api.submitRequest({
    fullName: "x",
    email: "x",
    companyName: "x",
    activities: null,
    remark: "",
    termMonths: 6,
    cr,
    summary: buildRequestSummary("Office Suites", 6, cr),
  });
  let status;
  for (let step = 1; step < 5; step += 1) status = await api.advanceRequestStage(requestId);
  return status.invoice;
}

test("the request's invoice lists the CR fee for a new CR only", async () => {
  const fresh = await invoiceFor({ option: "new", number: null });
  assert.deepEqual(fresh.lineItems.at(-1), { label: "CR registration fee", amount: 100 });
  assert.equal(fresh.amount, 800);
  const existing = await invoiceFor({ option: "existing", number: "123456-1" });
  assert.ok(!existing.lineItems.some((item) => item.label === "CR registration fee"));
  assert.equal(existing.amount, 700);
});

test("service taps: Office Suites asks about the CR first; CR Registration → term; Meeting Rooms isn't offered", async () => {
  const byId = (id) => SERVICES.find((s) => s.id === id);
  assert.equal(planRoute(byId("office-suites")).name, "CommercialRegistration");
  assert.equal(planRoute(byId("cr-registration")).name, "SelectTerm");
  assert.deepEqual(BROWSE_PLAN_IDS, ["office-suites", "cr-registration"]);
  assert.deepEqual((await api.fetchPlans()).map((plan) => plan.id), ["office-suites", "cr-registration"]);
});

test("paid in full: the invoice is the whole lease's rent + deposit, with no payment frequency", async () => {
  const summary = buildRequestSummary("Office Suites", 9);
  assert.equal(summary.payment, "In full, upfront");
  assert.equal(summary.rentLabel, "Rent (9 months)");
  assert.equal(summary.rent, formatBHD(900));
  assert.equal(summary.firstInvoiceTotal, formatBHD(1000));
  assert.ok(!("paymentFrequency" in summary));
  const invoice = await invoiceFor(null);
  assert.deepEqual(invoice.lineItems, [
    { label: "Rent (6 months) — paid in full", amount: 600 },
    { label: "Deposit", amount: 100 },
  ]);
});
