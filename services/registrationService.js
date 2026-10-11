import { quickSignUp } from "./mockApi";
import { submitSignUpEnquiry } from "./enquiryService";
import { submitSignUpCustomer } from "./customerCreationService";
import { errorMessage } from "./errorMessages";

// New User sign-up = the DEMO account (mockApi.quickSignUp — local, unchanged) + the enquiry to MAZ (enquiryService) +
// the customer record to MAZ (customerCreationService) — each sent only when switched on. The account comes first; an
// enquiry or customer failure never blocks it.
//
// registerNewUser(payload) → { email, enquiry, customer } where each of enquiry / customer is
//   { status: "recorded", … } — MAZ confirmed (2xx)
//   { status: "disabled" }    — sending is switched off; nothing was requested
//   { status: "failed", code, message } — not sent / not confirmed
// The enquiry and the customer are sent independently (one failing doesn't stop the other).
// Rejects only if the demo account itself fails (as before).
const settle = (promise) =>
  promise.catch((error) => ({ status: "failed", code: error?.code ?? null, message: errorMessage(error) }));

export async function registerNewUser(payload) {
  const account = await quickSignUp(payload);
  const [enquiry, customer] = await Promise.all([
    settle(submitSignUpEnquiry(payload)),
    settle(submitSignUpCustomer(payload)),
  ]);
  return { ...account, enquiry, customer };
}
