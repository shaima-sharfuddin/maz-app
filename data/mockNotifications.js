// MOCK — replace with API data. In-app notifications per demo account type (see demo/DemoContext.js).
// `target` is the screen a tap opens ({ screen, params }), or null for information-only notices.
// Raw values only — screens format dates.

export const MOCK_NOTIFICATIONS = {
  tenant: [
    {
      id: "NTF-1005",
      type: "bill",
      title: "Your October bill is ready",
      body: "BILL-2026-1018 for Office 204 · BHD 300.000, due 15 Oct 2026.",
      createdAt: "2026-09-26T09:00:00",
      read: false,
      target: { screen: "ContractDetail", params: { contractId: "BH-2026-0184" } },
    },
    {
      id: "NTF-1004",
      type: "notice",
      title: "Scheduled maintenance",
      body: "Air-conditioning servicing on Saturday 03 Oct, 08:00–10:00. Offices remain accessible throughout.",
      createdAt: "2026-09-24T11:30:00",
      read: false,
      target: null,
    },
    {
      id: "NTF-1002",
      type: "payment",
      title: "Payment received",
      body: "Thank you — BHD 300.000 received for Office 204 (receipt RCP-2026-0915).",
      createdAt: "2026-09-15T14:05:00",
      read: true,
      target: { screen: "ContractDetail", params: { contractId: "BH-2026-0184" } },
    },
    {
      id: "NTF-1001",
      type: "welcome",
      title: "Welcome to MAZ Business Center",
      body: "Your contracts, bills and payments are now available in the app.",
      createdAt: "2026-09-01T10:00:00",
      read: true,
      target: null,
    },
  ],
  newUser: [
    {
      id: "NTF-2001",
      type: "welcome",
      title: "Welcome to MAZ Business Center",
      body: "Browse our office suites and submit a request — our team will guide you through every step.",
      createdAt: "2026-09-27T09:00:00",
      read: false,
      target: { screen: "BrowsePlans", params: undefined },
    },
  ],
};
