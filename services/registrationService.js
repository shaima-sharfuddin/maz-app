import { quickSignUp } from "./mockApi";
import { sendVerificationCode } from "./otpService";
import { submitSignUpEnquiry } from "./enquiryService";
import { submitSignUpCustomer } from "./customerCreationService";
import { errorMessage } from "./errorMessages";

// New User sign-up = the DEMO account (mockApi.quickSignUp — local, unchanged) + the REAL verification code emailed by
// MAZ (otpService, POST /sendotp) + the enquiry to MAZ (enquiryService) + the customer record to MAZ
// (customerCreationService) — the last two only when switched on. The account comes first; a failed code, enquiry or
// customer never blocks it (VerifyAccount offers Resend when the code wasn't sent).
//
// registerNewUser(payload) → { email, otp, enquiry, customer }. otp: { status: "sent" } | { status: "failed", code,
// message }. Each of enquiry / customer is
//   { status: "recorded", … } — MAZ confirmed (2xx)
//   { status: "disabled" }    — sending is switched off; nothing was requested
//   { status: "failed", code, message } — not sent / not confirmed
// The enquiry and the customer are sent independently (one failing doesn't stop the other).
// Rejects only if the demo account itself fails (as before).
const settle = (promise) =>
  promise.catch((error) => ({ status: "failed", code: error?.code ?? null, message: errorMessage(error) }));

export async function registerNewUser(payload) {
  const account = await quickSignUp(payload);
  const [otp, enquiry, customer] = await Promise.all([
    settle(sendVerificationCode(account.email).then(() => ({ status: "sent" }))),
    settle(submitSignUpEnquiry(payload)),
    settle(submitSignUpCustomer(payload)),
  ]);
  return { ...account, otp, enquiry, customer };
}
