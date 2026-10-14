// Converts MAZ API records into the shapes the screens already use (the same shapes mockApi returns).
// This is the ONLY place API field names appear, so a backend rename is a one-file change.
//
// null means "unknown" — never "zero" or "none". Screens hide what they can't state truthfully
// (e.g. no "You're all paid up" when payment status is unknown).

import { CONTRACT_STATUS, INSTALLMENTS } from "../data/enums";

// API contract status code → { status, label, color }. `status` is the key screens and StatusBadge
// use ("draft" | "reviewing" | "active" | "expired" | "renewed" | "terminated"), from the backend's own
// labels (data/enums.js). A code not in the enum (e.g. "f" Archived, still disabled) gives status null —
// no badge — rather than a guess.
const CONTRACT_STATUS_MAP = Object.fromEntries(
  Object.entries(CONTRACT_STATUS).map(([code, { label, color }]) => [
    code,
    { status: label.toLowerCase(), label, color },
  ])
);

// A number, or null when MAZ sent nothing or something that isn't a number ("abc" → null, never NaN) — so an
// invalid amount is "unknown" (same as missing) and can't turn into "BHD NaN".
const toNumber = (value) => {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

// Receipt fields that MAY say whether an installment was paid. MAZ hasn't confirmed which one (or what rule)
// does, so they're passed through raw and services/billService.js decides the status (PROVISIONAL rule there).
const receiptPaymentFields = (receipt) => ({
  receiptDate: receipt.receipt_date ?? null,
  receiptAmount: toNumber(receipt.receipt_amt),
  receiptOn: receipt.receipt_on ?? null,
});

// API receipt (one rent installment) → ContractDetail bill row. `status` is left null here — billService sets it.
function toUiBillRow(receipt) {
  const rent = toNumber(receipt.sale_amt) ?? 0;
  const vat = toNumber(receipt.vat_amt) ?? 0;
  return {
    number: receipt.vch_no,
    periodLabel: receipt.description ?? null, // e.g. "RENT INST-1 (Sep 2026 – Nov 2026)" — no period dates in the API
    month: null,
    rent,
    vat,
    amount: rent + vat,
    dueDate: receipt.due_date ?? null,
    status: null,
    ...receiptPaymentFields(receipt),
  };
}

// API contract (+ units indexed by id) → the contract shape HomeDashboard / ContractDetail read.
export function toUiContract(apiContract, unitsById) {
  const unit = unitsById.get(apiContract.unit_id);
  const statusInfo = CONTRACT_STATUS_MAP[apiContract.status];
  return {
    id: apiContract.name, // "CN-2026-00001" — unique, and what tenants see, so it stays the UI id
    apiId: apiContract.id,
    customerId: apiContract.customer_id,
    unit: unit?.name ?? null,
    location: null, // not in the API
    // units.is_incubation (0 / 1), kept as raw data only — not shown in the Existing User UI (client, 2026-10-08)
    type: unit ? (unit.is_incubation ? "incubator" : "office") : null,
    status: statusInfo?.status ?? null,
    statusLabel: statusInfo?.label ?? null,
    statusColor: statusInfo?.color ?? null, // backend colour name, for reference
    apiStatus: apiContract.status ?? null,
    // Renewal requests have no API yet, and the mock renewal flow only knows mock contracts —
    // so real contracts don't offer "Renew contract" until a renewal endpoint exists.
    renewable: false,
    startDate: apiContract.from_date ?? null,
    endDate: apiContract.to_date ?? null,
    // Money fields whose meaning is clear (Existing User phase 3). rent_total is deliberately NOT mapped: whether
    // it includes VAT / the deposit is unconfirmed — screens show the installments' sum instead, labelled so.
    monthlyRate: toNumber(apiContract.rent_monthly_amt),
    numberOfMonths: toNumber(apiContract.number_of_months),
    installmentsPerYear: apiContract.installment ?? null, // INSTALLMENTS code, e.g. "4"
    paymentFrequency: INSTALLMENTS[apiContract.installment] ?? null, // "Quarterly"; unknown code → null
    deposit: toNumber(apiContract.deposit_amt),
    bills: (apiContract.receipts ?? []).map(toUiBillRow),
    bill: null,
    payment: null,
    outstanding: null,
    dueDate: null,
    paidThrough: null,
    renewal: null,
  };
}

// One receipt of a contract (already mapped by toUiContract) → the bill shape BillViewer reads.
export function toUiBill(contract, apiReceipt) {
  const rent = toNumber(apiReceipt.sale_amt) ?? 0;
  const vat = toNumber(apiReceipt.vat_amt) ?? 0;
  return {
    number: apiReceipt.vch_no,
    contractId: contract.id,
    unit: contract.unit,
    location: contract.location,
    periodLabel: apiReceipt.description ?? null,
    periodStart: null,
    periodEnd: null,
    dueDate: apiReceipt.due_date ?? null,
    status: null, // set by services/billService.js (PROVISIONAL rule)
    ...receiptPaymentFields(apiReceipt),
    lineItems: [{ label: "Rent", amount: rent }, ...(vat > 0 ? [{ label: "VAT", amount: vat }] : [])],
    total: rent + vat,
    payment: null,
  };
}

// API customer → the CompleteProfile form's { customer, owner } field names (renames only).
// gender codes become the form's labels via GENDER ("m" → "Male"; an unknown code passes through raw).
// company_id and nationality are passed through raw: how they map to COMPANIES / NATIONALITIES is unconfirmed.
// MAZ's customer record (GET /customers, /customers/{id} — checked 2026-10-10) has NO top-level id: the customer's id
// appears only on its owners (owners[].customer_id). The record also carries every owner's CPR / passport number,
// mobile and email — those are deliberately NOT mapped: the app only needs the customer's id and name, so nothing
// sensitive is kept in memory or reaches a screen.
// id: the top-level id if MAZ adds one, else the owners' customer_id when they all agree; null when unknown.
export function customerIdOf(apiCustomer) {
  if (apiCustomer?.id != null) return String(apiCustomer.id);
  const owners = Array.isArray(apiCustomer?.owners) ? apiCustomer.owners : [];
  const ids = new Set(owners.map((owner) => owner?.customer_id).filter((id) => id != null).map(String));
  return ids.size === 1 ? [...ids][0] : null;
}

export function toUiCustomer(apiCustomer) {
  const name = typeof apiCustomer?.name === "string" ? apiCustomer.name.trim() : "";
  return { id: customerIdOf(apiCustomer), name: name || null };
}

// POST /login's answer → the app session. { token, user: { id, name, username, role, company_id, customer_id } }
// (checked 2026-10-14). Returns null when the answer doesn't have that shape (no token / no user) — never a guessed
// session. customer_id null = a MAZ login with no customer yet → the New User dashboard. Ids are kept as text, like
// customerIdOf. companyName: the login carries only company_id (which MAZ entity), not the customer's company name.
export function toUiAuthSession(body, { email } = {}) {
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const user = body?.user;
  if (!token || !user || typeof user !== "object") return null;
  const username = typeof user.username === "string" && user.username.trim() ? user.username.trim() : email;
  const name = typeof user.name === "string" && user.name.trim() ? user.name.trim() : null;
  return {
    token,
    user: {
      email: username ?? null,
      name: name ?? username ?? null,
      companyName: null,
      customerId: user.customer_id == null || user.customer_id === "" ? null : String(user.customer_id),
      mazUserId: user.id == null ? null : String(user.id),
      companyId: user.company_id == null ? null : String(user.company_id),
      role: user.role ?? null,
      activity: null,
    },
    profileComplete: true,
  };
}

// Reference catalogues whose records are just a coded name: violation types ("#186 The commercial registration …")
// and business activities ("702 Management consultancy activities", "46691-1 Sale/Trading in …"). The code — digits,
// optionally "-<digits>" — is split off only when the name clearly starts with one and has a label after it; otherwise
// the whole name is the label (code null, e.g. a record that is just "332"). No other fields exist (no id).
const LEADING_CODE = /^#?(\d+(?:-\d+)?)\s+(\S.*)$/;
export function toUiCodedName(apiRecord) {
  const name = typeof apiRecord?.name === "string" ? apiRecord.name.trim() : "";
  if (!name) return null;
  const match = name.match(LEADING_CODE);
  return { name, code: match ? match[1] : null, label: match ? match[2].trim() : name };
}

// ---- Requests (app → MAZ) ----

// POST /enquiries — the fixed values every New User enquiry carries (given by the recruiter, 2026-10-10). The codes
// match the existing enquiry records (GET /enquiries): status "1" = New, Channel "c" = Google, ServiceType
// "i" = Incubator. status_label / Channel_label / ServiceType_label are response fields and are NOT sent.
export const ENQUIRY_FIXED_FIELDS = {
  status: "1",
  Channel: "c",
  assigned_to: "Asad",
  ServiceType: "i",
  payment_term: "1",
};

// The New User sign-up → MAZ's enquiry record. signUp: { companyName, customerName, countryCode ("+973"),
// phoneNumber (national digits, "36123456"), email, remarks }; date: "YYYY-MM-DD". The mobile is written the way the
// existing records store it — "00" + dial code digits + number ("0097336123456"); that format is copied from GET
// data, not confirmed by MAZ. Nationality, CPR / passport and activity are deliberately NOT sent.
export function toApiEnquiry(signUp, { date }) {
  const dialDigits = String(signUp.countryCode ?? "").replace(/\D/g, "");
  const national = String(signUp.phoneNumber ?? "").replace(/\D/g, "");
  return {
    date,
    company: String(signUp.companyName ?? "").trim(),
    ContactPerson: String(signUp.customerName ?? "").trim(),
    mobile: `00${dialDigits}${national}`,
    email: String(signUp.email ?? "").trim(),
    remarks: String(signUp.remarks ?? "").trim(),
    ...ENQUIRY_FIXED_FIELDS,
  };
}

// POST /customers — UNCONFIRMED by MAZ (2026-10-10): the body below copies the field names and codes of the existing
// customer records (GET /customers), not a spec. Fixed values every New User customer carries — all four existing
// records use status 1, isIncubation 0, lmraStatus 0, isVatOn 0; company_id 2 is the MAZ entity of the most recent
// records (COMPANIES in data/formOptions.js — CONFIRM with MAZ which entity new app sign-ups belong to).
export const CUSTOMER_FIXED_FIELDS = {
  status: 1,
  isIncubation: 0,
  lmraStatus: 0,
  isVatOn: 0,
  company_id: 2,
};

// The New User sign-up → MAZ's customer record: the company is the customer, the person signing up its owner
// (type "o" = Owner, OwnerTypeEnum). Mobile in the stored records' format ("00" + dial code digits + number).
// country: the sign-up's nationality as a country name, like the records ("India"); "Other" → null.
// name_ar (Arabic name) isn't collected; the records suggest it's required, so the company name is sent — CONFIRM.
// ⚠️ NOT sent: CPR / passport numbers. GET /customers is public (no login) and returns every owner's ID numbers, so
// sending them would publish them. Add them once MAZ protects that endpoint. Also not sent: activity (no MAZ id for
// it), gender (not collected), remarks (they go with the enquiry).
export function toApiCustomer(signUp) {
  const companyName = String(signUp.companyName ?? "").trim();
  const email = String(signUp.email ?? "").trim();
  const dialDigits = String(signUp.countryCode ?? "").replace(/\D/g, "");
  const national = String(signUp.phoneNumber ?? "").replace(/\D/g, "");
  const nationality = String(signUp.nationality ?? "").trim();
  return {
    name: companyName,
    name_ar: companyName,
    email,
    ...CUSTOMER_FIXED_FIELDS,
    owners: [
      {
        name: String(signUp.customerName ?? "").trim(),
        mobile: dialDigits && national ? `00${dialDigits}${national}` : null,
        email,
        country: nationality && nationality !== "Other" ? nationality : null,
        type: "o",
      },
    ],
  };
}
