// Code → label mappings for every status / type field in MAZ's backend, copied exactly from the
// recruiter's PHP enums. API records carry the CODE ("c", "2" …); look the label up here.
// services/apiMappers.js is the place that turns codes into what screens show.

// units.status
export const UNIT_STATUS = { 1: "Available", 2: "Reserved", 3: "Occupied" };

export const SERVICE_TYPE = { o: "Office", i: "Incubator" };

// e.g. contracts.deposit_received_Mode, deposit_payment_Mode, comm_payment_mode, receipts.receipt_mode
export const PAYMENT_MODE = { 1: "Cash", 2: "Bank" };

export const OWNER_TYPE = { o: "Owner", p: "Partner", s: "Shareholder", m: "Manager", a: "Agent", c: "Company" };

export const MUNICIPALITY_STATUS = { a: "Registered", b: "Cancelled", c: "Reopened", d: "On Process" };

// contracts.installment — number of installments per year
export const INSTALLMENTS = { 12: "Monthly", 4: "Quarterly", 2: "Half-Yearly", 1: "Yearly" };

// customers.gender
export const GENDER = { m: "Male", f: "Female" };

export const ENQUIRY_STATUS = { 1: "New", 2: "Follow-up In Progress", 3: "Qualified", 4: "Unqualified" };

// contracts.status. `color` is the backend's own (Bootstrap) colour name; the app maps it to theme
// tones in components/StatusBadge.js rather than using it directly.
// "e" Renewed was disabled in the backend; ENABLED here per the recruiter (2026-10-05) — an approved
// renewal leaves the contract "Renewed". Its colour isn't in the backend code we have: "success" is
// the app's choice. "f" Archived is still disabled in the backend — add it here if it gets enabled.
export const CONTRACT_STATUS = {
  a: { label: "Draft", color: "secondary" },
  b: { label: "Reviewing", color: "warning" },
  c: { label: "Active", color: "success" },
  d: { label: "Expired", color: "primary" },
  e: { label: "Renewed", color: "success" },
  g: { label: "Terminated", color: "gray" },
};
