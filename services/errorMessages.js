// User-facing wording for failures — one place, used by the HTTP transport (services/httpClient.js) and by screens
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
  NOT_FOUND: "We couldn't find what you were looking for.",
  UNAUTHORIZED: "Your session has expired. Please log in again.",
  // A 401 when the app sent no token (auth is still mock): not a session problem, so no sign-out.
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
