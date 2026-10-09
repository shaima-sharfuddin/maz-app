// Shared test helpers: a scriptable fake fetch (no request ever reaches MAZ) and SYNTHETIC fixtures in MAZ's
// response shapes. Each *.test.mjs file runs in its own process, so module state (caches) starts fresh per file.
const API = "https://maz.beeinfosoft.com/public/api";

// ---- fixtures (synthetic — not real customer data) ----
const receipt = (vch, amount, dueDate) => ({
  vch_no: vch,
  description: `RENT ${vch}`,
  sale_amt: String(amount),
  vat_amt: "0",
  due_date: dueDate,
  receipt_date: null,
  receipt_amt: null,
  receipt_on: null,
});
export const contract = (overrides = {}) => ({
  id: 101,
  name: "CN-TEST-0001",
  customer_id: 1,
  unit_id: 10,
  status: "c", // Active
  from_date: "2026-01-01",
  to_date: "2027-12-31",
  rent_monthly_amt: "100.00",
  number_of_months: 24,
  installment: "4",
  deposit_amt: "100.00",
  receipts: [receipt("CN-TEST-0001-1", 300, "2026-01-01"), receipt("CN-TEST-0001-2", 300, "2099-01-01")],
  ...overrides,
});
export const otherCustomersContract = () =>
  contract({ id: 202, name: "CN-OTHER-0001", customer_id: 2, receipts: [receipt("CN-OTHER-0001-1", 999, "2026-01-01")] });
export const contractsBody = (list = [contract(), otherCustomersContract()]) => JSON.stringify({ data: list, links: { next: null } });
export const unitsBody = () =>
  JSON.stringify({ data: [{ id: 10, name: "Office 204", is_incubation: 0 }, { id: 11, name: "INC 001", is_incubation: 1 }] });
export const customerBody = () => JSON.stringify({ data: { id: 1, name: "Test Customer" } });

// ---- fake fetch ----
// routes: { "/contracts": handler, "/units": handler, … } — handler(url, init) → Response | Promise | throws.
// Unrouted paths answer with the default fixtures. Every call is recorded in `calls` (paths).
export const calls = [];
let routes = {};
export const json = (body, status = 200) => () => new Response(body, { status, headers: { "Content-Type": "application/json" } });
export const status = (code, body = "<html>Whoops! Stack trace: /var/www/app/Http/Controllers/…</html>") => () =>
  new Response(body, { status: code });
export const networkDown = () => () => {
  throw new TypeError("Network request failed");
};

export function setRoutes(next) {
  routes = next;
}
export function resetCalls() {
  calls.length = 0;
}
export const callsTo = (prefix) => calls.filter((path) => path.startsWith(prefix)).length;

globalThis.fetch = async (url, init = {}) => {
  const path = String(url).replace(API, "");
  calls.push(path);
  const key = Object.keys(routes)
    .sort((a, b) => b.length - a.length)
    .find((prefix) => path.startsWith(prefix));
  if (key) return routes[key](path, init);
  if (path.startsWith("/contracts")) return json(contractsBody())();
  if (path.startsWith("/units")) return json(unitsBody())();
  if (path.startsWith("/customers")) return json(customerBody())();
  throw new Error(`Unexpected request in test: ${path}`);
};

// ---- app modules ----
export const api = await import("../services/api.js");
export const auth = await import("../services/authService.js");

// A fresh demo Existing User session (customer 1). Each login is a new session object → its own contracts cache.
export async function loginExistingUser() {
  const session = await auth.logIn({ email: `tenant.${Math.random().toString(36).slice(2)}@example.com`, password: "x" });
  auth.setCurrentSession(session);
  return session;
}

// The rejection of a promise (or null if it resolved).
export async function rejectionOf(promise) {
  try {
    await promise;
    return null;
  } catch (error) {
    return error;
  }
}
