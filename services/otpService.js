import { post } from "./http/apiClient";
import { ApiError } from "./apiError";
import { ERROR_MESSAGES } from "./errorMessages";
import { toApiSendOtp, toApiVerifyOtp } from "./apiMappers";

// New User email verification — REAL (2026-10-14): MAZ emails a one-time code and checks it.
//   POST /sendotp   { email }       → 2xx = the code was emailed
//   POST /verifyotp { email, otp }  → 2xx = verified; a wrong / expired code answers 422 { "error": "Invalid OTP" }
// Both are public (no token — sign-up happens signed out); a 401 never signs anyone out. Checked 2026-10-14 with
// requests that send no email: an empty body → 422 naming the fields, a malformed email → 422, a wrong code → 422.
// MAZ's success body isn't known yet, so any 2xx counts — unless the body itself says it failed (status / success
// false, or an `error`), which is treated like a 422.
const OPTIONS = { skipAuth: true, skipUnauthorizedHandler: true };

const saysFailed = (body) =>
  body != null && typeof body === "object" && (body.status === false || body.success === false || body.error != null);

const apiError = (code) => new ApiError(code, ERROR_MESSAGES[code]);

// → { sent: true, email }. Rejects INVALID_EMAIL (MAZ refused the address), OTP_NOT_SENT (2xx that says it failed),
// or the transport's NETWORK / TIMEOUT / RATE_LIMITED / SERVER …
export async function sendVerificationCode(email) {
  let body;
  try {
    body = await post("/sendotp", toApiSendOtp(email), OPTIONS);
  } catch (error) {
    if (error?.code === "VALIDATION") throw apiError("INVALID_EMAIL");
    throw error;
  }
  if (saysFailed(body)) throw apiError("OTP_NOT_SENT");
  return { sent: true, email: toApiSendOtp(email).email };
}

// Resend = ask MAZ for a new code (the screen keeps its 30 s cooldown).
export const resendVerificationCode = sendVerificationCode;

// { email, code } → { verified: true }. A wrong or expired code → INVALID_CODE.
export async function verifyEmail({ email, code }) {
  let body;
  try {
    body = await post("/verifyotp", toApiVerifyOtp(email, code), OPTIONS);
  } catch (error) {
    if (error?.code === "VALIDATION" || error?.code === "BAD_REQUEST") throw apiError("INVALID_CODE");
    throw error;
  }
  if (saysFailed(body)) throw apiError("INVALID_CODE");
  return { verified: true };
}
