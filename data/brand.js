// Brand facts from MAZ's marketing site. Testimonials are intentionally absent —
// we don't have permission to reuse their real client quotes.

export const TRUST_STATS = [
  { value: "4.9", label: "Google rating" },
  { value: "18+", label: "Years of excellence" },
  { value: "25+", label: "Companies supported" },
];

// Welcome taglines (approved addition, 2026-10-09), chosen by context: `newUser` on a device where nobody has
// signed in yet, `returning` once someone has (useAuth().hasSignedInBefore). Each is a headline + supporting line.
// Final copy (approved 2026-10-09).
export const WELCOME_TAGLINES = {
  newUser: {
    headline: "Where ambitious businesses begin.",
    line: "A prestigious address in Bahrain, from your first enquiry to your first day.",
  },
  returning: {
    headline: "Welcome back to your workspace.",
    line: "Your contracts, payments and renewals, ready when you are.",
  },
};

export const BAHRAIN_ADVANTAGES = [
  { value: "0%", label: "Corporate tax" },
  { value: "100%", label: "Foreign ownership" },
];

// Descriptions are MAZ's own wording from their site. `icon` is an Ionicons name chosen for the app
// (FeatureCard on HomeDashboard, PlanCard on BrowsePlans). `hourly: true` = booked by the hour (the
// existing meeting-room booking), never leased through the term / payment-frequency flow (client, 2026-10-07).
// Browse Plans shows only these, in this order (client feedback, 2026-10-07): Office, Meeting Room, CR
// Registration. Startup Incubator is hidden there, not deleted — flagged for confirmation in CLAUDE.md.
export const BROWSE_PLAN_IDS = ["office-suites", "meeting-rooms", "cr-registration"];

export const SERVICES = [
  {
    id: "office-suites",
    title: "Office Suites",
    icon: "business-outline",
    description: "Private, fully serviced executive rooms with sea views",
  },
  {
    id: "cr-registration",
    title: "CR Registration",
    icon: "document-text-outline",
    description: "Commercial Registration and address services for entrepreneurs",
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
