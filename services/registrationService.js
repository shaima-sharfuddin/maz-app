import { quickSignUp } from "./mockApi";
import { createMazLogin } from "./registerService";
import { sendVerificationCode, verifyEmail } from "./otpService";
import { submitSignUpEnquiry } from "./enquiryService";
import { submitSignUpCustomer } from "./customerCreationService";
import { ApiError } from "./apiError";
import { ERROR_MESSAGES, errorMessage } from "./errorMessages";

// New User sign-up, in two steps:
//   1. registerNewUser(payload) — "Submit & verify email": the DEMO account (mockApi.quickSignUp — local; it copies named
//      fields only, so the password isn't kept there) + the REAL verification code emailed by MAZ (otpService, POST
//      /sendotp) + the enquiry and the customer record to MAZ (enquiryService / customerCreationService — only when
//      switched on). A failed code, enquiry or customer never blocks sign-up (VerifyAccount offers Resend when the code
//      wasn't sent). NO MAZ login yet.
//   2. verifyAndRegister({ email, code }) — VerifyAccount: MAZ checks the code (POST /verifyotp); only then is the MAZ
//      login created (registerService, POST /register — email + password). Then the user logs in.
//
// Between the two steps the sign-up details (incl. the password) are kept HERE, in memory only — never in navigation
// params or storage. A new sign-up replaces them, a created login clears them, an app restart loses them.
//
// registerNewUser(payload) → { email, otp, enquiry, customer }. otp: { status: "sent" } | { status: "failed", code,
// message }. Each of enquiry / customer is
//   { status: "recorded", … } — MAZ confirmed (2xx)
//   { status: "disabled" }    — sending is switched off; nothing was requested
//   { status: "failed", code, message } — not sent / not confirmed
// The enquiry and the customer are sent independently (one failing doesn't stop the other).
// Rejects only if the demo account itself fails.
const settle = (promise) =>
  promise.catch((error) => ({ status: "failed", code: error?.code ?? null, message: errorMessage(error) }));

// { email, details, verified } — the sign-up waiting for its code. `verified` is remembered so a failed /register can
// be retried without checking the (possibly used-up) code again.
let pending = null;

const sameEmail = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

export async function registerNewUser(payload) {
  const account = await quickSignUp(payload);
  pending = { email: account.email, details: payload, verified: false };
  const [otp, enquiry, customer] = await Promise.all([
    settle(sendVerificationCode(account.email).then(() => ({ status: "sent" }))),
    settle(submitSignUpEnquiry(payload)),
    settle(submitSignUpCustomer(payload)),
  ]);
  return { ...account, otp, enquiry, customer };
}

// → { registered: true }. Rejects SIGN_UP_EXPIRED (no details for this email — e.g. the app restarted), INVALID_CODE,
// ACCOUNT_EXISTS, REGISTRATION_FAILED, or the transport's NETWORK / TIMEOUT / SERVER …
export async function verifyAndRegister({ email, code }) {
  if (!pending || !sameEmail(pending.email, email)) throw new ApiError("SIGN_UP_EXPIRED", ERROR_MESSAGES.SIGN_UP_EXPIRED);
  const signUp = pending;
  if (!signUp.verified) {
    await verifyEmail({ email: signUp.email, code });
    signUp.verified = true;
  }
  await createMazLogin(signUp.details);
  if (pending === signUp) pending = null;
  return { registered: true };
}
