import { fetchActivities } from "./httpApi";
import { ACTIVITIES as SAMPLE_ACTIVITIES } from "../data/formOptions";

// The New User sign-up's Activity options — the ONLY activities entry point for screens.
// REAL: GET /activities (MAZ's business activities, e.g. "702 Management consultancy activities" — the leading code
// is kept in the label). If MAZ's list can't be loaded or comes back empty, the labelled SAMPLE options
// (data/formOptions.js ACTIVITIES) are used instead, so sign-up never blocks.
// The chosen label is kept in the app only (sign-up → session → office / CR request). It is NOT saved to MAZ: there
// is no write endpoint, and /activities returns no id to send (customers' activityId values don't match its codes).
//   → { options: [label], source: "maz" | "sample" }
// MAZ records with no words — today one is just "332" — are left out: a bare number gives nothing to choose by.
const hasWords = (name) => /\p{L}/u.test(name);

export async function fetchActivityOptions() {
  try {
    const activities = (await fetchActivities()).filter((activity) => hasWords(activity.name));
    if (activities.length > 0) return { options: activities.map((activity) => activity.name), source: "maz" };
  } catch {
    // fall through to the samples — the field shows a note and a way to retry
  }
  return { options: SAMPLE_ACTIVITIES, source: "sample" };
}
