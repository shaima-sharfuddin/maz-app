// MOCK — replace with API data. Content follows the recruiter's wireframe (dashboard + contract
// detail); dates are moved to 2026 so nothing looks years overdue. Raw values only — screens format.

export const MOCK_TENANT_NAME = "Sara";

export const MOCK_CONTRACTS = [
  {
    id: "BH-2026-0184",
    unit: "Office 204",
    location: "Seef District",
    type: "office",
    status: "active",
    bill: { number: "BILL-2026-1018", periodStart: "2026-10-01", periodEnd: "2026-10-31" },
    payment: { method: "BenefitPay", lastAmount: 300, lastDate: "2026-09-15", receipt: "RCP-2026-0915" },
    outstanding: 300,
    dueDate: "2026-10-15",
    bills: [
      { number: "BILL-2026-1018", month: "2026-10-01", amount: 300, dueDate: "2026-10-15", status: "due" },
      { number: "BILL-2026-1112", month: "2026-11-01", amount: 300, dueDate: "2026-11-15", status: "upcoming" },
      { number: "BILL-2026-1210", month: "2026-12-01", amount: 300, dueDate: "2026-12-15", status: "upcoming" },
    ],
  },
  {
    id: "BH-2026-0117",
    unit: "Incubator Desk I-12",
    location: "Manama",
    type: "incubator",
    status: "active",
    paidThrough: "2026-10-31",
    bill: { number: "BILL-2026-1003", periodStart: "2026-10-01", periodEnd: "2026-10-31" },
    payment: { method: "BenefitPay", lastAmount: 150, lastDate: "2026-10-01", receipt: "RCP-2026-1001" },
    outstanding: 0,
    bills: [],
  },
  {
    id: "BH-2025-0062",
    unit: "Office 108",
    location: "Diplomatic Area",
    type: "office",
    status: "expired",
    endDate: "2025-12-31",
    bill: { number: "BILL-2025-1201", periodStart: "2025-12-01", periodEnd: "2025-12-31" },
    payment: { method: "Bank transfer", lastAmount: 250, lastDate: "2025-12-01", receipt: "RCP-2025-1201" },
    outstanding: 0,
    bills: [],
  },
];
