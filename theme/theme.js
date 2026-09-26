// Single source of truth for every color in the app. Screens and components read these
// via useTheme() — never hardcode hex/rgba values elsewhere.

// Brand colors (from MAZ's logo) — identical in both modes.
export const BRAND = {
  navy: "#1a3966",
  crimson: "#a31c37",
};

const dark = {
  background: "#101828", // deep navy page background
  surface: "rgba(255,255,255,0.04)", // cards
  surfaceBorder: "rgba(255,255,255,0.08)",
  sheet: "#101828", // bottom sheets / modals
  backdrop: "rgba(0,0,0,0.6)",

  text: "#ffffff",
  textSecondary: "#cbd5e1", // field labels, back button
  textMuted: "#94a3b8", // subtitles, descriptions, ghost buttons
  textSubtle: "#64748b", // placeholders, empty-list hints
  accent: "#94a3b8", // eyebrow labels (navy is too dark to read on the dark background)

  primary: BRAND.crimson,
  onPrimary: "#ffffff",
  primarySoft: "rgba(163,28,55,0.15)", // icon circles, monogram tiles
  primaryTint: "rgba(163,28,55,0.08)", // selected card background

  inputBackground: "rgba(255,255,255,0.08)",
  inputBorder: "rgba(255,255,255,0.1)",
  dashedBorder: "rgba(255,255,255,0.15)",
  skeleton: "rgba(255,255,255,0.1)",

  success: "#34d399",
  successSoft: "rgba(52,211,153,0.12)", // badge backgrounds
  danger: "#f87171",
  dangerSoft: "rgba(248,113,113,0.12)",
};

// Light mode is a counterpart, not an inversion: off-white page, white cards, the dark navy
// background becomes the text color, and brand navy takes over accent duties.
const light = {
  background: "#f6f7f9",
  surface: "#ffffff",
  surfaceBorder: "#e4e7ec",
  sheet: "#ffffff",
  backdrop: "rgba(16,24,40,0.4)",

  text: "#101828",
  textSecondary: "#344054",
  textMuted: "#5d6b82",
  textSubtle: "#98a2b3",
  accent: BRAND.navy,

  primary: BRAND.crimson,
  onPrimary: "#ffffff",
  primarySoft: "rgba(163,28,55,0.10)",
  primaryTint: "rgba(163,28,55,0.05)",

  inputBackground: "#ffffff",
  inputBorder: "#d0d5dd",
  dashedBorder: "#c4cad4",
  skeleton: "rgba(16,24,40,0.08)",

  success: "#047857",
  successSoft: "#ecfdf3",
  danger: "#b42318",
  dangerSoft: "#fef3f2",
};

export const PALETTES = { light, dark };
