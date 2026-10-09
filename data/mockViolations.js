// MOCK — replace with API data (there is no /violations endpoint yet). Titles are REAL violation types
// from MAZ's admin panel (Violations module); the notices themselves, dates and wording are samples.
// Other real types: "Practicing activity without approval", "Violation of the rules of the Ministry of
// Works, Municipalities Affairs and Urban Planning", "Violation of the rules of Social Insurance Organization".
// Open notices carry a dueDate (when the tenant must have it fixed). Raw values only.

export const MOCK_VIOLATIONS = [
  {
    id: "VIO-5003",
    contractId: "BH-2026-0184",
    title: "Commercial name does not match with the signboard",
    issuedOn: "2026-09-18",
    dueDate: "2026-10-18",
    status: "open",
    description:
      "The name on your office signboard differs from the commercial name registered on your CR. Please update the signboard so it matches your registered name exactly.",
    fine: null,
  },
  {
    id: "VIO-5002",
    contractId: "BH-2026-0117",
    title: "Audited financial report should be submitted",
    issuedOn: "2026-09-10",
    dueDate: "2026-10-31",
    status: "open",
    description:
      "We haven't yet received your audited financial statements for the last financial year. Please submit a copy to our team to keep your file compliant.",
    fine: null,
  },
  {
    id: "VIO-5001",
    contractId: "BH-2026-0184",
    title: "No Signboard",
    issuedOn: "2026-08-20",
    status: "resolved",
    description:
      "No signboard showing your registered commercial name was found at your office. Every registered business must display one at its premises.",
    fine: null,
    resolvedOn: "2026-09-05",
    resolution: "A signboard showing your commercial name was installed and verified by our team.",
  },
];
