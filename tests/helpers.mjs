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
// Unrouted paths answer with the default fixtures. Every call is recorded in `calls` (paths) and `requests`
// ({ path, method, headers, body }).
export const calls = [];
export const requests = [];
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
  requests.length = 0;
}
export const callsTo = (prefix) => calls.filter((path) => path.startsWith(prefix)).length;

// A fake MAZ login: POST /login answers this user (customer_id → the session's customer).
export const loginBody = ({ customerId = 1, token = "TKN-TEST", username = "live@example.com", name = "Live Customer" } = {}) =>
  JSON.stringify({
    message: "Login successful",
    token,
    user: { id: 7, name, username, role: null, company_id: 1, customer_id: customerId },
  });

// The fake MAZ email verification: POST /sendotp always "sends"; POST /verifyotp accepts TEST_OTP_CODE only and
// answers a wrong code the way MAZ does (422 { "error": "Invalid OTP" }).
export const TEST_OTP_CODE = "246810";
const verifyOtpAnswer = (init) => {
  const { otp } = JSON.parse(init.body ?? "{}");
  return otp === TEST_OTP_CODE ? json('{"message":"OTP verified"}')() : json('{"error":"Invalid OTP"}', 422)();
};

globalThis.fetch = async (url, init = {}) => {
  const path = String(url).replace(API, "");
  calls.push(path);
  requests.push({ path, method: (init.method ?? "GET").toUpperCase(), headers: init.headers ?? {}, body: init.body ?? null });
  const key = Object.keys(routes)
    .sort((a, b) => b.length - a.length)
    .find((prefix) => path.startsWith(prefix));
  if (key) return routes[key](path, init);
  if (path.startsWith("/contracts")) return json(contractsBody())();
  if (path.startsWith("/units")) return json(unitsBody())();
  if (path.startsWith("/customers")) return json(customerBody())();
  if (path.startsWith("/login")) return json(loginBody())();
  if (path.startsWith("/logout")) return json('{"message":"Logged out"}')();
  if (path.startsWith("/sendotp")) return json('{"message":"OTP sent"}')();
  if (path.startsWith("/verifyotp")) return verifyOtpAnswer(init);
  throw new Error(`Unexpected request in test: ${path}`);
};

// ---- app modules ----
// The app's axios client gets an adapter that hands each request to the fake fetch above (no request ever leaves the
// test). The app's own code — interceptors (Bearer token), timeout, status → ApiError mapping — runs unchanged.
const { apiClient, API_BASE_URL } = await import("../services/http/apiClient.js");
apiClient.defaults.adapter = async (config) => {
  const url = /^https?:/.test(config.url) ? config.url : `${API_BASE_URL}${config.url}`;
  const headers = typeof config.headers?.toJSON === "function" ? config.headers.toJSON() : { ...config.headers };
  const response = await globalThis.fetch(url, {
    method: (config.method ?? "get").toUpperCase(),
    headers,
    body: config.data,
    signal: config.signal,
  });
  return { data: await response.text(), status: response.status, statusText: "", headers: {}, config, request: {} };
};

export const api = await import("../services/api.js");
export const auth = await import("../services/authService.js");

// A signed-in customer, as the app gets one: the real logIn against the fake POST /login (answering customer_id
// `customerId`), then the session is made current like AuthContext does. Each call is a new session object → its own
// contracts cache. Customer 1 owns the fixture contract CN-TEST-0001. customerId null → a New User login.
// `username` logs in as a given account again (same email → same account for the per-account demo stores).
export async function loginLiveCustomer(customerId = 1, { username = `live.${Math.random().toString(36).slice(2)}@example.com` } = {}) {
  const previous = routes;
  const token = `TKN-LIVE-${Math.random().toString(36).slice(2)}`;
  routes = { ...routes, "/login": json(loginBody({ customerId, token, username })) };
  try {
    const session = await auth.logIn({ email: username, password: "secret" });
    auth.setCurrentSession(session);
    return session;
  } finally {
    routes = previous;
  }
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
