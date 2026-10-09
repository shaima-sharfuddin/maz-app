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
