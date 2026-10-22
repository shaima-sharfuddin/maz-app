// Workspace photography, bundled with the app (never fetched at runtime). Provenance:
// assets/images/workspace/CREDITS.md. Overlays / fades are applied in code (components/PhotoHero.js,
// components/HeroPanel.js). Photos follow the palette rule in theme/theme.js (PALETTE): a new photo is graded /
// cropped to fit the palette, never allowed to bring its own colour scheme.
//   REAL MAZ photos (2026-10-09): welcome = MAZ's reception (cropped around the wall logo for the portrait hero),
//   dashboard = the Amwaj Islands waterfront. maz-meeting-room.jpg is RESERVED for a future screen — not wired up.
//   Licensed Unsplash stock (generic offices, NOT MAZ's — never caption them as MAZ's): plans, contract, renewal.
export const WORKSPACE_PHOTOS = {
  welcome: require("../assets/images/workspace/maz-reception.jpg"), // real — Welcome hero
  dashboard: require("../assets/images/workspace/maz-waterfront.jpg"), // real — dashboard, both user states
  plans: require("../assets/images/workspace/plans-office-suite.jpg"), // stock — Browse Plans banner
  contract: require("../assets/images/workspace/contract-facade.jpg"), // stock — Contract Details cover
  renewal: require("../assets/images/workspace/renewal-reception.jpg"), // stock — renewal screens
};

// Listing photos per service (PlanCard carousels, PlanDetail header) — ALL licensed stock, generic offices, NOT MAZ's:
// real MAZ photos stay off service cards (CLAUDE.md), and these are never captioned as MAZ's. Key = SERVICES id.
const STOCK = {
  officeSuite: require("../assets/images/workspace/plans-office-suite.jpg"),
  corridor: require("../assets/images/workspace/dashboard-corridor.jpg"),
  lobby: require("../assets/images/workspace/welcome-lobby.jpg"),
  facade: require("../assets/images/workspace/contract-facade.jpg"),
  reception: require("../assets/images/workspace/renewal-reception.jpg"),
  crSigning: require("../assets/images/workspace/cr-signing.jpg"),
  crConsultation: require("../assets/images/workspace/cr-consultation.jpg"),
};
export const PLAN_PHOTOS = {
  "office-suites": [STOCK.officeSuite, STOCK.corridor, STOCK.lobby],
  // Its own photos (user, 2026-10-22): paperwork + an adviser, none shared with Office Suites.
  "cr-registration": [STOCK.crSigning, STOCK.crConsultation, STOCK.facade],
  "startup-incubator": [STOCK.lobby, STOCK.corridor],
  "meeting-rooms": [STOCK.reception, STOCK.officeSuite],
};

export const planPhotos = (plan) => PLAN_PHOTOS[plan?.id] ?? [STOCK.officeSuite];
