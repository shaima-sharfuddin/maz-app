// User-facing wording for failures — one place, used by the HTTP transport (services/http/apiClient.js) and by screens
// (via services/api.js → errorMessage). Fixed, friendly sentences only: server error bodies (stack traces, file
// paths — MAZ runs with debug output on) are never shown.

export const ERROR_MESSAGES = {
  NETWORK: "We couldn't reach MAZ. Check your internet connection and try again.",
  TIMEOUT: "MAZ took too long to respond. Please try again.",
  SERVER: "MAZ's service is temporarily unavailable. Please try again in a moment.",
  FORBIDDEN: "You don't have permission to view this information.",
  RATE_LIMITED: "Too many requests were made. Please wait a moment, then try again.",
  INVALID_RESPONSE: "We couldn't process the information from MAZ. Please try again later.",
  BAD_REQUEST: "MAZ couldn't complete this request. Please try again, or contact MAZ if it keeps happening.",
  VALIDATION: "MAZ couldn't accept some of these details. Check them and try again, or contact MAZ.",
  NOT_FOUND: "We couldn't find what you were looking for.",
  UNAUTHORIZED: "Your session has expired. Please log in again.",
  INVALID_CREDENTIALS: "Incorrect email or password.",
  // Email verification (services/otpService.js).
  INVALID_CODE: "That code isn't right or has expired. Check your email, or resend a new code.",
  INVALID_EMAIL: "MAZ couldn't send a code to this email address. Check it and try again.",
  OTP_NOT_SENT: "We couldn't send your verification code. Please try again.",
  // A 401 when the app sent no token (signed out): not a session problem, so no sign-out.
  NOT_AUTHORIZED: "MAZ didn't allow access to this information. Please try again later.",
};

const GENERIC = "Something went wrong. Please try again.";

// The message to show for a failed load or action. Every API function rejects with ApiError, whose message is
// already user-safe (transport errors above, or a business rule such as "There's nothing to pay right now.");
// anything else (an unexpected exception) gets a generic sentence rather than its technical text.
export function errorMessage(error) {
  if (error?.name === "ApiError" && error.message) return error.message;
  return ERROR_MESSAGES[error?.code] ?? GENERIC;
}
