// MOCK — replace with API data. The tenant's past support enquiries (newest first).
// Raw values only — screens format dates.

export const MOCK_ENQUIRIES = [
  {
    id: "ENQ-3002",
    category: "Facilities & maintenance",
    contractId: "BH-2026-0184",
    subject: "Additional access card",
    message: "Could we have one more access card for Office 204? A new team member joins on 01 Oct.",
    createdAt: "2026-09-22T10:15:00",
    status: "open",
    reply: null,
  },
  {
    id: "ENQ-3001",
    category: "Billing & payments",
    contractId: "BH-2026-0184",
    subject: "VAT details on invoices",
    message: "Please add our VAT account number to future invoices for Office 204.",
    createdAt: "2026-09-05T09:40:00",
    status: "answered",
    reply: {
      from: "MAZ Client Services",
      body: "Thank you — your VAT account number has been added and will appear on all invoices from October onwards.",
      createdAt: "2026-09-06T12:00:00",
    },
  },
];
