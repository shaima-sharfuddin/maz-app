// MOCK — replace with API data. PLACEHOLDER violation types until MAZ confirms what it records
// (building rules, documents, late payments …) and how fines are charged. Raw values only.

export const MOCK_VIOLATIONS = [
  {
    id: "VIO-5003",
    contractId: "BH-2026-0184",
    title: "Corridor obstruction",
    category: "Building rules",
    issuedOn: "2026-09-18",
    status: "open",
    description:
      "Boxes were left in the corridor outside Office 204, obstructing the fire exit route. Please keep shared corridors clear at all times.",
    fine: null,
  },
  {
    id: "VIO-5002",
    contractId: "BH-2026-0117",
    title: "Commercial registration copy expired",
    category: "Documents",
    issuedOn: "2026-09-10",
    status: "open",
    description:
      "The copy of your commercial registration on file expired on 31 Aug 2026. Please send a renewed copy to our team to keep your account compliant.",
    fine: null,
  },
  {
    id: "VIO-5001",
    contractId: "BH-2026-0184",
    title: "Late payment fee",
    category: "Payments",
    issuedOn: "2026-08-20",
    status: "resolved",
    description: "The August bill for Office 204 was paid after its due date.",
    fine: 10,
    resolvedOn: "2026-09-15",
    resolution: "The fee was settled with your September payment.",
  },
];
