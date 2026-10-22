import { post } from "./http/apiClient";
import { ApiError } from "./apiError";
import { ERROR_MESSAGES } from "./errorMessages";
import { toApiResetPassword } from "./apiMappers";
import { sendVerificationCode } from "./otpService";

// Forgot password (Login → ForgotPassword → ResetPassword), 2026-10-20.
//   1. The code: MAZ's REAL POST /sendotp { email } (otpService) — the same email code as sign-up.
//   2. The save: POST /resetpassword { email, otp, password, password_confirmation } — ⚠️ ASSUMED. MAZ has not
//      provided a reset endpoint yet; the route and field names are a guess (Laravel conventions). Change the route in
//      reset() / apiMappers.toApiResetPassword once MAZ confirms. Until the route exists MAZ answers 404 →
//      RESET_UNAVAILABLE.
// The code is NOT checked with /verifyotp first: the reset call carries it, and verifying first could use it up.
// Public (no token — the user is signed out); a 401 never signs anyone out. The password is never stored.
const OPTIONS = { skipAuth: true, skipUnauthorizedHandler: true };

const saysFailed = (body) =>
  body != null && typeof body === "object" && (body.status === false || body.success === false || body.error != null);

const apiError = (code) => new ApiError(code, ERROR_MESSAGES[code]);

// A 422 naming the otp field (or MAZ's sign-up style { "error": "Invalid OTP" }) = wrong / expired code.
const isBadCode = (error) => (error?.fields ?? []).includes("otp");

// → { sent: true, email }. Same errors as sendVerificationCode (INVALID_EMAIL, OTP_NOT_SENT, NETWORK …).
export const sendPasswordResetCode = (email) => sendVerificationCode(email);

// A double tap shares the request in flight.
let inFlight = null;

// { email, code, password } → { reset: true }. Rejects INVALID_CODE, RESET_FAILED, RESET_UNAVAILABLE (no such route
// at MAZ yet), or the transport's NETWORK / TIMEOUT / RATE_LIMITED / SERVER …
export function resetPassword(details) {
  if (!inFlight) {
    inFlight = reset(details).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function reset({ email, code, password }) {
  let body;
  try {
    body = await post("/resetpassword", toApiResetPassword(email, code, password), OPTIONS);
  } catch (error) {
    if (error?.code === "NOT_FOUND") throw apiError("RESET_UNAVAILABLE");
    if (error?.code === "VALIDATION") throw apiError(isBadCode(error) || error.fields?.length === 0 ? "INVALID_CODE" : "RESET_FAILED");
    if (error?.code === "BAD_REQUEST") throw apiError("RESET_FAILED");
    throw error;
  }
  if (saysFailed(body)) throw apiError(/otp/i.test(String(body.error ?? "")) ? "INVALID_CODE" : "RESET_FAILED");
  return { reset: true };
}
