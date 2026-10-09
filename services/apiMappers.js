// Converts MAZ API records into the shapes the screens already use (the same shapes mockApi returns).
// This is the ONLY place API field names appear, so a backend rename is a one-file change.
//
// null means "unknown" — never "zero" or "none". Screens hide what they can't state truthfully
// (e.g. no "You're all paid up" when payment status is unknown).

import { CONTRACT_STATUS, GENDER, INSTALLMENTS } from "../data/enums";

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
export function toUiCustomer(apiCustomer) {
  return {
    id: apiCustomer.id,
    customer: {
      companyId: apiCustomer.company_id ?? null,
      customerName: apiCustomer.name ?? "",
      vatNumber: apiCustomer.vatNo ?? "",
      vatRegistrationDate: apiCustomer.vatRegDate ?? null,
      crNumber: apiCustomer.crNo ?? "",
      crRegistrationDate: apiCustomer.crRegDate ?? null,
      address: apiCustomer.address ?? "",
    },
    owner: {
      ownerName: apiCustomer.ownerName ?? "",
      ownerType: null, // the form's Owner Type (OwnerTypeEnum) — /customers returns no owner-type field yet
      ownerMobile: apiCustomer.ownerMobile ?? "",
      email: apiCustomer.email ?? "",
      cprNumber: apiCustomer.cprNo ?? "",
      cprExpiryDate: apiCustomer.cprExpDate ?? null,
      passportNumber: apiCustomer.passportNo ?? "",
      passportExpiryDate: apiCustomer.passportExp ?? null,
      nationality: apiCustomer.nationality ?? null,
      gender: apiCustomer.gender == null ? null : (GENDER[apiCustomer.gender] ?? apiCustomer.gender),
    },
  };
}
