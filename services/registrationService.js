import { quickSignUp } from "./mockApi";
import { submitSignUpEnquiry } from "./enquiryService";
import { errorMessage } from "./errorMessages";

// New User sign-up = the DEMO account (mockApi.quickSignUp — local, unchanged) + the enquiry to MAZ
// (enquiryService — only when switched on). The account comes first; an enquiry failure never blocks it.
//
// registerNewUser(payload) → { email, enquiry } where enquiry is
//   { status: "recorded", enquiry } — MAZ confirmed (2xx)
//   { status: "disabled" }          — sending is switched off; nothing was requested
//   { status: "failed", code, message } — not sent / not confirmed; the screen offers "Send again" or continue
// Rejects only if the demo account itself fails (as before).
export async function registerNewUser(payload) {
  const account = await quickSignUp(payload);
  try {
    return { ...account, enquiry: await submitSignUpEnquiry(payload) };
  } catch (error) {
    return { ...account, enquiry: { status: "failed", code: error?.code ?? null, message: errorMessage(error) } };
  }
}
