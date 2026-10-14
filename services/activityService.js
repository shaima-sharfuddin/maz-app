import { fetchActivities } from "./httpApi";
import { ACTIVITIES as SAMPLE_ACTIVITIES } from "../data/formOptions";

// The New User sign-up's Activity options — the ONLY activities entry point for screens.
// REAL: GET /activities (MAZ's business activities, e.g. "702 Management consultancy activities" — the leading code
// is kept in the label). MAZ answers it only with a login (Bearer token, sent automatically by apiClient); signed out —
// as on the sign-up form — it answers 401. If MAZ's list can't be loaded (401, network, server) or comes back empty,
// the labelled SAMPLE options (data/formOptions.js ACTIVITIES) are used instead, so sign-up never blocks.
// The chosen label is kept in the app only (sign-up → session → office / CR request). It is NOT saved to MAZ: there
// is no write endpoint, and /activities returns no id to send (customers' activityId values don't match its codes).
//   → { options: [label], source: "maz" | "sample" }
// MAZ records with no words — today one is just "332" — are left out: a bare number gives nothing to choose by.
const hasWords = (name) => /\p{L}/u.test(name);

// The last answer this app run (MAZ's list or the samples) — so sign-up can show the dropdown at once.
let latest = null;

export async function fetchActivityOptions() {
  let result = { options: SAMPLE_ACTIVITIES, source: "sample" };
  try {
    const activities = (await fetchActivities()).filter((activity) => hasWords(activity.name));
    if (activities.length > 0) result = { options: activities.map((activity) => activity.name), source: "maz" };
  } catch {
    // fall through to the samples — the field shows a note and a way to retry
  }
  latest = result;
  return result;
}

// Synchronous, for the sign-up screen's FIRST render (no loading state): the last answer if there is one, else the
// samples marked source "pending" (no "couldn't be loaded" note yet) while fetchActivityOptions runs.
export function peekActivityOptions() {
  return latest ?? { options: SAMPLE_ACTIVITIES, source: "pending" };
}

// Start loading early (WelcomeScreen) so MAZ's list is usually ready before the sign-up form opens. Never rejects.
export function prefetchActivityOptions() {
  fetchActivityOptions();
}
