// Single source of truth for every color in the app — plus the spacing / radius / type / elevation tokens at the
// bottom. Screens and components read colors via useTheme() — never hardcode hex/rgba values elsewhere.

// Brand colors (from MAZ's logo) — identical in both modes.
export const BRAND = {
  navy: "#1a3966",
  crimson: "#a31c37",
};

// ---- THE PALETTE — permanent rule (premium redesign, 2026-10-10; replaces the 2026-10-09 crimson-primary rule) ----
// MAZ's visual identity is these five colours and nothing else:
//   ivory    — warm ivory #f2eee7: THE PAGE BACKGROUND in light mode since 2026-10-22 (user decision — "rich and
//              professional"; replaces off-white #f6f7f9), under a soft navy glow (components/PageBackground.js)
//   offWhite — soft off-white #f6f7f9: no longer the page; kept for quiet fills
//   white    — pure white: cards and content surfaces
//   navy     — deep navy BRAND.navy #1a3966: THE PRIMARY colour — primary buttons, important headings, selected
//              states (segments, chips, the selected tab), focus borders, icon tiles, HeroPanel / PhotoHero "navy".
//              navyDeep #101828 is body text in light mode and the page background in dark mode.
//              Also the accent fill (colors.ivory / ivoryText; the "inverse" button on navy panels)
//   crimson  — BRAND.crimson #a31c37: used SPARINGLY, only for meaningful highlights and alerts (colors.highlight:
//              unread markers, the brand square on SectionHeading). Never a primary button, never dominant.
// Dark mode: navy can't be the primary on a navy page, so dark mode's primary is a lighter, accessible navy
// (#9db4d9, ~8.4:1 against #101828) with dark text on it (onPrimary).
// RULE: any reference photo, mockup or design input that doesn't match this palette is recoloured / adapted to fit
// it — never imported with its own colours (authentic MAZ photography is never recoloured). Known exceptions, kept
// deliberately:
//   • dark mode uses navyDeep as the page background and translucent white surfaces instead of pure white cards
//   • status tones (success green, warning amber, danger red, info blue) sit outside the palette — they carry
//     meaning (paid / under review / due) and stay as they are
//   • dark mode's hero navy is #16294a (between navy and navyDeep), not BRAND.navy
//   • dark-mode eyebrow labels use slate grey (colors.accent) because navy is unreadable on the dark background
// Screens still read colours through useTheme() (colors.background, colors.text, colors.heading, colors.primary,
// colors.highlight, colors.hero, colors.ivory / ivoryText …) — never from PALETTE directly.
export const PALETTE = {
  offWhite: "#f6f7f9",
  white: "#ffffff",
  navy: BRAND.navy,
  navyDeep: "#101828",
  ivory: "#f2eee7",
  crimson: BRAND.crimson,
};

const dark = {
  background: PALETTE.navyDeep, // deep navy page background (a flagged palette exception — see PALETTE)
  canvas: "transparent", // screens' root background: PageBackground shows through
  pageGlow: "#9db4d9", // a lighter navy glow on the dark page
  surface: "rgba(255,255,255,0.045)", // cards
  surfaceBorder: "rgba(255,255,255,0.085)",
  surfaceMuted: "rgba(255,255,255,0.03)", // quiet inset areas inside a card (icon tiles, footers)
  divider: "rgba(255,255,255,0.07)", // hairlines between rows inside a card
  sheet: "#101828", // bottom sheets / modals
  backdrop: "rgba(0,0,0,0.6)",

  text: "#ffffff",
  heading: "#ffffff", // screen titles
  textSecondary: "#cbd5e1", // field labels, back button
  textMuted: "#94a3b8", // subtitles, descriptions, ghost buttons
  textSubtle: "#64748b", // placeholders, empty-list hints
  accent: "#94a3b8", // eyebrow labels (navy is too dark to read on the dark background)

  // Lighter, accessible navy: navy itself disappears on the navy page (see PALETTE).
  primary: "#9db4d9",
  onPrimary: "#101828",
  primarySoft: "rgba(157,180,217,0.16)", // icon circles, monogram tiles
  primaryTint: "rgba(157,180,217,0.08)", // selected card background

  // Crimson highlight — sparingly: unread markers, the SectionHeading brand square. Brightened for the dark page.
  highlight: "#e0566f",
  highlightSoft: "rgba(224,86,111,0.14)",

  ivory: "rgba(243,234,216,0.10)", // luxury accent fill — sparingly (a quiet warm tint on the dark page)
  ivoryText: PALETTE.ivory, // ivory text / icons — sparingly

  inputBackground: "rgba(255,255,255,0.08)",
  inputBorder: "rgba(255,255,255,0.1)",
  dashedBorder: "rgba(255,255,255,0.15)",
  skeleton: "rgba(255,255,255,0.1)",

  success: "#34d399",
  successSoft: "rgba(52,211,153,0.12)", // badge backgrounds
  danger: "#f87171",
  dangerSoft: "rgba(248,113,113,0.12)",
  warning: "#fbbf24", // in-between states, e.g. a contract under review
  warningSoft: "rgba(251,191,36,0.12)",
  warningBorder: "rgba(251,191,36,0.35)",
  info: "#93c5fd", // neutral notices (e.g. the demo-account banner)
  infoSoft: "rgba(147,197,253,0.10)",

  // Hero surface: the navy panel behind headline content (payment summary, contract cover, banners).
  hero: "#16294a",
  heroBorder: "rgba(255,255,255,0.08)",
  onHero: "#ffffff",
  onHeroMuted: "rgba(255,255,255,0.72)",
  onHeroSubtle: "rgba(255,255,255,0.5)",
  heroDivider: "rgba(255,255,255,0.12)",
  heroGlass: "rgba(255,255,255,0.12)", // chips / icon circles on navy or photos
  headerGlass: "rgba(16,24,40,0.72)", // icon buttons floating over a photo hero
  heroAction: PALETTE.ivory, // the "inverse" button on a navy panel: ivory fill, navy label
  onHeroAction: BRAND.navy,

  // Bottom tab bar (premium redesign): selected = primary, unselected = muted neutral.
  tabBar: "#0c1322",
  tabBarBorder: "rgba(255,255,255,0.08)",
  tabActive: "#9db4d9",
  tabInactive: "#64748b",

  disabledBackground: "rgba(255,255,255,0.08)", // disabled buttons
  disabledText: "#64748b",
};

// Light mode is a counterpart, not an inversion: ivory page (+ navy glow), white cards, the dark navy
// background becomes the text color, and brand navy is the primary colour.
const light = {
  background: PALETTE.ivory, // warm ivory page (2026-10-22) — PageBackground adds the navy glow
  canvas: "transparent", // screens' root background: PageBackground (ivory + glow) shows through
  pageGlow: BRAND.navy, // the glow's colour (PageBackground)
  surface: PALETTE.white,
  surfaceBorder: "#e6e9ef",
  surfaceMuted: "#f8f9fb",
  divider: "#e5dfd5", // warm hairline — reads on the ivory page and inside white cards
  sheet: "#ffffff",
  backdrop: "rgba(16,24,40,0.4)",

  text: "#101828",
  heading: BRAND.navy, // screen titles
  textSecondary: "#344054",
  textMuted: "#5d6b82",
  textSubtle: "#98a2b3",
  accent: BRAND.navy,

  primary: BRAND.navy,
  onPrimary: "#ffffff",
  primarySoft: "rgba(26,57,102,0.08)", // icon circles, monogram tiles
  primaryTint: "rgba(26,57,102,0.04)", // selected card background

  // Crimson highlight — sparingly: unread markers, the SectionHeading brand square.
  highlight: BRAND.crimson,
  highlightSoft: "rgba(163,28,55,0.08)",

  ivory: PALETTE.ivory, // premium accent fill — sparingly (a quiet warm tint, never a large area)
  ivoryText: "#7a5f30", // ivory-family text / icons: raw ivory is unreadable on white, so a deep warm tone — sparingly

  inputBackground: "#ffffff",
  inputBorder: "#d5dae2",
  dashedBorder: "#c9cfd9",
  skeleton: "rgba(16,24,40,0.07)",

  success: "#047857",
  successSoft: "#ecfdf3",
  danger: "#b42318",
  dangerSoft: "#fef3f2",
  warning: "#b54708",
  warningSoft: "#fffaeb",
  warningBorder: "#fedf89",
  info: BRAND.navy,
  infoSoft: "#eef3fa",

  hero: BRAND.navy,
  heroBorder: BRAND.navy,
  onHero: "#ffffff",
  onHeroMuted: "rgba(255,255,255,0.75)",
  onHeroSubtle: "rgba(255,255,255,0.55)",
  heroDivider: "rgba(255,255,255,0.14)",
  heroGlass: "rgba(255,255,255,0.16)",
  headerGlass: "rgba(255,255,255,0.86)",
  heroAction: PALETTE.ivory, // the "inverse" button on a navy panel: ivory fill, navy label
  onHeroAction: BRAND.navy,

  // Bottom tab bar (premium redesign): selected = navy, unselected = muted neutral.
  tabBar: PALETTE.white,
  tabBarBorder: "#e6e9ef",
  tabActive: BRAND.navy,
  tabInactive: "#98a2b3",

  disabledBackground: "#e4e7ec",
  disabledText: "#98a2b3",
};

export const PALETTES = { light, dark };

// ---- Non-color design tokens (same in both modes) ----

// Spacing scale (pt). Screens use these (or the matching Tailwind classes: 4 = 1, 8 = 2, 16 = 4, 24 = 6, 32 = 8).
export const SPACING = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  section: 32, // between sections (mb-8)
  gutter: 24, // screen side padding (Airbnb-style screens, px-6)
};

export const RADIUS = {
  sm: 8, // icon tiles inside rows
  md: 12, // fields, inline banners
  card: 16, // cards
  hero: 20, // hero panels and banners
  sheet: 28, // the rounded bottom of full-width photo heroes
  pill: 999, // buttons, chips
  photo: 20, // listing photos (PlanCard, PhotoCarousel)
};

// Type scale. Spread into a Text style: style={[TYPE.cardTitle, { color: colors.text }]}.
// Figures use tabular numerals so amounts and counts line up and don't jitter when they change.
const FIGURES = { fontVariant: ["tabular-nums"] };
export const TYPE = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: "700", letterSpacing: -0.9 }, // Welcome headline only
  largeTitle: { fontSize: 32, lineHeight: 38, fontWeight: "800", letterSpacing: -0.8 }, // home greetings, detail titles
  screenTitle: { fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.6 },
  listingTitle: { fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.2 }, // PlanCard title
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: "700", letterSpacing: -0.2 },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: "600", letterSpacing: 1.4, textTransform: "uppercase" },
  cardTitle: { fontSize: 16, lineHeight: 22, fontWeight: "600" },
  amountHero: { fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.4, ...FIGURES },
  amountDisplay: { fontSize: 36, lineHeight: 42, fontWeight: "700", letterSpacing: -0.8, ...FIGURES }, // the one figure a screen is about
  statValue: { fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.4, ...FIGURES },
  value: { fontSize: 15, lineHeight: 20, fontWeight: "600", ...FIGURES },
  body: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
  status: { fontSize: 12, lineHeight: 16, fontWeight: "600" },
};

// Elevation: a soft, low shadow under cards in LIGHT mode only. Dark mode separates cards by their border —
// and Android draws an elevation shadow through translucent surfaces, so dark cards must not have one.
export const ELEVATION = {
  light: {
    card: {
      shadowColor: "#101828",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 14,
      elevation: 2,
    },
    // Hero panels sit one step higher than cards.
    hero: {
      shadowColor: "#1a3966",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 18,
      elevation: 4,
    },
  },
  dark: { card: {}, hero: {} },
};

// Motion: short and decelerating — content settles into place, nothing bounces.
export const MOTION = {
  enterDuration: 320,
  enterOffset: 10, // pt a section rises while it fades in
  stagger: 60, // ms between consecutive sections
  maxStaggerSteps: 6, // later sections don't wait any longer
  // Reanimated presets (Visual system v2): presses use a stiff, critically damped spring (no wobble); everything else
  // eases out.
  pressSpring: { damping: 20, stiffness: 400, mass: 0.6 },
  pressScale: 0.97,
  cardPressScale: 0.98,
  headerFade: 180, // ms — the collapsing header's solid bar
  sheetDuration: 280, // ms — BottomSheet slide
};
