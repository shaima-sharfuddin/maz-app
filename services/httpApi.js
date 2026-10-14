import { get, getAllPages } from "./http/apiClient";
import { toUiBill, toUiCodedName, toUiContract, toUiCustomer } from "./apiMappers";
import { mockProfileEdits, mockSignUpProfile } from "./mockApi";
import { ApiError } from "./apiError";
import { requireLiveCustomerId } from "./customerService";
import { getCurrentSession } from "./authService";

// REAL endpoints (read-only). Same names and result shapes as the mock functions they replace,
// so services/api.js can switch them one at a time and screens don't change.

// ⚠️ LIVE CUSTOMER DATA GATE: every customer-specific read here (customer record, contracts, bills / receipts) first
// calls customerService.requireLiveCustomerId(), which only passes for a session issued by the MAZ login whose user
// has a customer_id. Anything else — a New User (customer_id null), an edited or hand-built session — gets NO_CUSTOMER
// BEFORE any request. Every request carries the session's Bearer token (services/http/apiClient.js). Public
// catalogues (units, violation types, activities) aren't customer data.

// Units rarely change and /units returns the full list (~480) in one response, so it's fetched
// once per session. A failed load isn't cached, so "Try again" refetches.
// MAZ has no smaller units request: /units/{id} answers an empty 200 and ?ids= / ?id= / ?page= are ignored
// (checked 2026-10-09), so contracts' unit names need this list until MAZ includes them in /contracts.
// Units also carry status ("1" / "3"), std_rent_amt and max_cr (checked 2026-10-10). Their meaning isn't confirmed,
// so they are NOT used anywhere — in particular std_rent_amt is never shown as a price (prices stay the labelled
// samples in data/pricing.js). Only id, name and is_incubation are read (apiMappers.toUiContract).
let unitsPromise = null;
let unitsByIdPromise = null;
export function fetchUnits() {
  if (!unitsPromise) {
    unitsPromise = getAllPages("/units").catch((error) => {
      unitsPromise = null;
      unitsByIdPromise = null;
      throw error;
    });
  }
  return unitsPromise;
}

// id → unit, built once from the cached list.
function loadUnitsById() {
  if (!unitsByIdPromise) {
    unitsByIdPromise = fetchUnits().then((units) => new Map(units.map((unit) => [unit.id, unit])));
  }
  return unitsByIdPromise;
}

// Unit names are only labels, so a failed /units never stops contracts from showing: the names come out null
// (screens show "Unit to be confirmed") and, because a failure isn't cached, the next load asks MAZ again.
const loadUnitsByIdOrNone = () => loadUnitsById().catch(() => NO_UNITS);
const NO_UNITS = new Map();

// id → { id, name } — ONLY the id and name (apiMappers.toUiCustomer drops the owners' CPR / passport / contact
// details the record carries). Only the logged-in LIVE customer's own record (any other id → NOT_FOUND, unrequested). A record that says it belongs to a different
// customer is refused (NOT_FOUND), so another customer's name can never be shown. An unknown id → MAZ answers 404
// (with a debug page — never shown: the transport turns it into a fixed NOT_FOUND message).
export async function fetchCustomer(customerId) {
  const liveCustomerId = requireLiveCustomerId();
  if (customerId != null && String(customerId) !== String(liveCustomerId)) throw new ApiError("NOT_FOUND", "Customer not found.");
  customerId = liveCustomerId;
  const response = await get(`/customers/${encodeURIComponent(customerId)}`);
  if (!response?.data || typeof response.data !== "object") throw new ApiError("NOT_FOUND", "Customer not found.");
  const customer = toUiCustomer(response.data);
  if (customer.id != null && customer.id !== String(customerId)) throw new ApiError("NOT_FOUND", "Customer not found.");
  return { ...customer, id: customer.id ?? String(customerId) };
}

// Reference catalogues — public lists with no customer data, one response each (no links / meta; ?page is ignored,
// checked 2026-10-10). Like /units: fetched once per app run and shared by simultaneous callers; a failure or an
// empty list isn't cached, so the next call (e.g. "Try again") asks MAZ again.
function cachedCatalogue(path, compare) {
  let promise = null;
  return () => {
    if (!promise) {
      promise = getAllPages(path)
        .then((records) => {
          const byName = new Map();
          for (const record of records.map(toUiCodedName)) if (record && !byName.has(record.name)) byName.set(record.name, record);
          if (byName.size === 0) promise = null; // an empty list isn't cached either — a retry asks MAZ again
          return [...byName.values()].sort(compare);
        })
        .catch((error) => {
          promise = null;
          throw error;
        });
    }
    return promise;
  };
}
const byCode = (a, b) => (Number(a.code) || Infinity) - (Number(b.code) || Infinity) || a.label.localeCompare(b.label);
const byLabel = (a, b) => a.label.localeCompare(b.label);

// GET /violations — MAZ's catalogue of violation TYPES ({ name: "#186 …" }), NOT notices issued to a customer
// (no customer, contract, date, status or fine). → [{ name, code, label }], by code.
export const fetchViolationTypes = cachedCatalogue("/violations", byCode);

// GET /activities — MAZ's business activities ({ name: "702 Management consultancy activities" }, 165 today, no id)
// → [{ name, code, label }], alphabetical by label. Used for the New User sign-up's Activity options.
export const fetchActivities = cachedCatalogue("/activities", byLabel);

// EditProfile's pre-fill → { email, values: { companyName, customerName, email } }. `user` is the session user.
// In order: edits saved this session (mock updateProfile — no real write yet); what a New User entered at
// sign-up this session; otherwise the session's name / company / email. No request is made: the real customer
// record (GET /customers/{id}) is NOT read here, so its nationality / CPR / passport never reach the profile UI.
export async function fetchProfile(user) {
  const email = user?.email ?? "";
  const known = mockProfileEdits(email) ?? mockSignUpProfile(email);
  return {
    email,
    values: {
      companyName: known?.companyName ?? user?.companyName ?? "",
      customerName: known?.customerName ?? user?.name ?? "",
      email,
    },
  };
}

// The logged-in customer's raw API contracts, cached briefly so the screens of one visit share a single download
// (dashboard, its notification bell, Contract List / Details, bills, payments, renewals, notifications, enquiries):
// - simultaneous callers share the request in flight;
// - a finished result is reused for CONTRACTS_CACHE_MS, then the next caller downloads again;
// - the cache belongs to one session object + customer: logging out, logging in again or a different customer
//   always starts a fresh download (never another customer's contracts);
// - a failed download isn't kept, so "Try again" goes to MAZ.
// Only MAZ's raw data is cached — the demo payment overlay (billService) and expiry are applied on every read.
// ⚠️ DEV-ONLY SCOPING — GET /contracts returns EVERY customer's contracts (it ignores ?customer_id= and needs
// no auth), so they're filtered here, on the phone. Not the final architecture: replace with a customer-scoped,
// authenticated endpoint (e.g. contracts for the token's customer) as soon as MAZ provides one.
const CONTRACTS_CACHE_MS = 60 * 1000;
let contractsCache = null; // { session, customerId, promise, settledAt }

function loadTenantRawContracts() {
  const customerId = requireLiveCustomerId();
  const session = getCurrentSession();
  const cached = contractsCache;
  const fresh =
    cached &&
    cached.session === session &&
    cached.customerId === customerId &&
    (cached.settledAt == null || Date.now() - cached.settledAt < CONTRACTS_CACHE_MS);
  if (fresh) return cached.promise;

  const entry = { session, customerId, promise: null, settledAt: null };
  entry.promise = getAllPages("/contracts").then(
    (contracts) => {
      entry.settledAt = Date.now();
      // Compared as text: MAZ sends numbers today, but a "1" vs 1 mismatch must neither hide the customer's own
      // contracts nor let anyone else's through.
      return contracts.filter((contract) => String(contract?.customer_id) === String(customerId));
    },
    (error) => {
      if (contractsCache === entry) contractsCache = null;
      throw error;
    }
  );
  contractsCache = entry;
  return entry.promise;
}

// The raw contracts + a unit lookup, loaded in parallel. `withUnits: false` skips waiting for /units (unit names
// come out null) — the dashboard uses it to show counts and payments before the unit list arrives. A /units failure
// gives null unit names rather than an error.
async function loadTenantContracts({ withUnits = true } = {}) {
  const [raw, unitsById] = await Promise.all([loadTenantRawContracts(), withUnits ? loadUnitsByIdOrNone() : NO_UNITS]);
  return { raw, unitsById };
}

// contractId is the contract number shown in the app ("CN-2026-00001"). Looking it up in the
// tenant's own list (rather than /contracts/{id}) keeps other customers' contracts out of reach.
async function findTenantContract(contractId) {
  const { raw, unitsById } = await loadTenantContracts();
  const match = raw.find((contract) => contract.name === contractId);
  if (!match) throw new ApiError("NOT_FOUND", "Contract not found.");
  return { raw: match, contract: toUiContract(match, unitsById) };
}

// Every contract of the logged-in customer, mapped (bills' paid status is added by services/billService.js).
// Used by services/contractService.js (dashboard, contract list). { withUnits: false } → unit names null.
export async function fetchCustomerContracts({ withUnits = true } = {}) {
  const { raw, unitsById } = await loadTenantContracts({ withUnits });
  return raw.map((contract) => toUiContract(contract, unitsById));
}

export async function fetchContract(contractId) {
  return (await findTenantContract(contractId)).contract;
}

// billNumber is the receipt's voucher number ("CN-2026-00001-1").
export async function fetchBill(contractId, billNumber) {
  const { raw, contract } = await findTenantContract(contractId);
  const receipt = (raw.receipts ?? []).find((item) => item.vch_no === billNumber);
  if (!receipt) throw new ApiError("NOT_FOUND", "Bill not found.");
  return toUiBill(contract, receipt);
}
