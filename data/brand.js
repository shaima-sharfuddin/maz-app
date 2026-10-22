// Brand facts from MAZ's marketing site. Testimonials are intentionally absent —
// we don't have permission to reuse their real client quotes.

export const TRUST_STATS = [
  { value: "4.9", label: "Google rating", icon: "star-outline" },
  { value: "18+", label: "Years of excellence", icon: "ribbon-outline" },
  { value: "25+", label: "Companies supported", icon: "briefcase-outline" },
];

// Welcome headline + supporting line. The 2-minute booking promise is mandatory — keep it in any rewording.
// Line chosen by the user (2026-10-22). Earlier: "Book your fully serviced office in just two minutes." /
// "Request your office in just 2 minutes."
export const WELCOME_TAGLINE = {
  headline: "A prestigious address for your business.",
  line: "Secure your premium workspace in just two minutes, effortlessly.",
};

export const BAHRAIN_ADVANTAGES = [
  { value: "0%", label: "Corporate tax", icon: "trending-down-outline" },
  { value: "100%", label: "Foreign ownership", icon: "globe-outline" },
];

// Descriptions are MAZ's own wording from their site. `icon` is an Ionicons name chosen for the app
// (FeatureCard on HomeDashboard, PlanCard on BrowsePlans). `hourly: true` = booked by the hour (the
// existing meeting-room booking), never leased through the term / payment-frequency flow (client, 2026-10-07).
// Browse Plans shows only these, in this order (client feedback, 2026-10-07): Office, Meeting Room, CR
// Registration. Startup Incubator is hidden there, not deleted — flagged for confirmation in CLAUDE.md.
export const BROWSE_PLAN_IDS = ["office-suites", "cr-registration"]; // Meeting Rooms removed (client, 2026-10-14)

export const SERVICES = [
  {
    id: "office-suites",
    title: "Office Space", // was "Office Suites" (user, 2026-10-22)
    requiresCr: true, // asks "existing CR or new CR?" first (CommercialRegistrationScreen)
    icon: "business-outline",
    description: "Private, fully serviced executive rooms with sea views",
    tagline: "Private executive office · fully serviced",
  },
  {
    id: "cr-registration",
    title: "CR Registration",
    icon: "document-text-outline",
    description: "Commercial Registration and address services for entrepreneurs",
    tagline: "Company setup · registered address",
  },
  {
    id: "startup-incubator",
    title: "Startup Incubator",
    icon: "rocket-outline",
    description: "Mentorship and shared resources for growing businesses",
  },
  {
    id: "meeting-rooms",
    title: "Meeting Rooms",
    icon: "people-outline",
    hourly: true,
    description: "Marble boardrooms and intimate conference suites",
  },
];

// PlanDetail's "How it works" — the app's REAL flow for a request (2026-10-20: invoice at once, Tap payment); the unit
// itself is assigned by MAZ afterwards. Keep in step with ReviewRequest / RequestInvoice / TapCheckout.
export const HOW_IT_WORKS = [
  { icon: "calendar-outline", title: "Choose your lease", body: "Pick any length from 1 to 36 months." },
  { icon: "receipt-outline", title: "Get your invoice instantly", body: "Rent and deposit, paid in full, upfront." },
  { icon: "card-outline", title: "Pay securely", body: "Card or BenefitPay, secured by Tap." },
  { icon: "key-outline", title: "MAZ prepares your office", body: "Our team confirms your unit and contract." },
];

// MAZ's real contact details, for the Support screen (not shown anywhere yet).
// `phoneDial` is the same number without spaces, for tel: links.
export const CONTACT = {
  phone: "+973 3663 8844",
  phoneDial: "+97336638844",
  email: "info@mazbusiness.com",
  hours: [
    { days: "Sunday–Wednesday", time: "8:00 AM–6:00 PM" },
    { days: "Thursday & Saturday", time: "8:00 AM–4:00 PM" },
    { days: "Friday", time: "Closed" },
  ],
};
