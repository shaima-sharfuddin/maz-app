// Unsafe API data: invalid amounts, customer-id type mismatches, other customers' contracts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { api, contract, otherCustomersContract, contractsBody, setRoutes, json, loginExistingUser } from "./helpers.mjs";
import { formatBHD } from "../data/pricing.js";

const real = (list) => list.filter((c) => !c.demo);

test("invalid amounts become unknown (null) — never NaN, never 'BHD NaN'", async () => {
  await loginExistingUser();
  const bad = contract({ rent_monthly_amt: "abc", deposit_amt: "1,000", number_of_months: "twelve" });
  bad.receipts[0].sale_amt = "abc";
  bad.receipts[1].vat_amt = "n/a";
  setRoutes({ "/contracts": json(contractsBody([bad])) });

  const [mapped] = real(await api.fetchContracts());
  assert.equal(mapped.monthlyRate, null);
  assert.equal(mapped.deposit, null);
  assert.equal(mapped.numberOfMonths, null);
  for (const bill of mapped.bills) {
    assert.ok(Number.isFinite(bill.amount), `bill ${bill.number} amount is a number`);
  }
  // An installment with an invalid amount counts like a missing one (0) — the totals stay numbers.
  const dashboard = await api.fetchDashboard("tenant");
  for (const key of ["total", "paid", "balance", "due"]) {
    assert.ok(Number.isFinite(dashboard.payment[key]), `payment.${key} is a number`);
    assert.doesNotMatch(formatBHD(dashboard.payment[key]), /NaN/);
  }
  const amounts = api.contractAmounts(mapped);
  assert.ok(Number.isFinite(amounts.rentFromInstallments));
});

test("customer id sent as text (\"1\") still matches the session's customer 1", async () => {
  await loginExistingUser();
  setRoutes({ "/contracts": json(contractsBody([contract({ customer_id: "1" }), otherCustomersContract()])) });
  assert.deepEqual(
    real(await api.fetchContracts()).map((c) => c.id),
    ["CN-TEST-0001"]
  );
});

test("another customer's contracts are never shown — as a number, as text, or with no customer id", async () => {
  await loginExistingUser();
  setRoutes({
    "/contracts": json(
      contractsBody([
        otherCustomersContract(),
        contract({ id: 303, name: "CN-OTHER-TEXT", customer_id: "2" }),
        contract({ id: 404, name: "CN-NO-CUSTOMER", customer_id: null }),
        contract({ id: 505, name: "CN-PREFIX", customer_id: 11 }),
      ])
    ),
  });
  assert.deepEqual(real(await api.fetchContracts()), []);
  const dashboard = await api.fetchDashboard("tenant");
  assert.equal(dashboard.summary.totalCount, 0);
});
