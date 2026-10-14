import { post } from "./http/apiClient";
import { ApiError } from "./apiError";
import { ERROR_MESSAGES } from "./errorMessages";
import { toApiRegister } from "./apiMappers";

// New User sign-up → a REAL MAZ login (2026-10-14): POST /register with the sign-up details and the chosen password
// (body: apiMappers.toApiRegister). Afterwards the user logs in with that email and password (services/mazAuth.js).
// Public (no token — sign-up happens signed out); a 401 never signs anyone out.
// MAZ's success body isn't known yet, so any 2xx counts — unless the body itself says it failed (status / success
// false, or an `error`), as in otpService.
const OPTIONS = { skipAuth: true, skipUnauthorizedHandler: true };

const saysFailed = (body) =>
  body != null && typeof body === "object" && (body.status === false || body.success === false || body.error != null);

const apiError = (code) => new ApiError(code, ERROR_MESSAGES[code]);

// A 422 naming the username or email = that address is already registered (field names assumed — not yet seen).
const isTaken = (error) => (error?.fields ?? []).some((field) => field === "username" || field === "email");

// A double tap shares the request in flight, so one sign-up never registers twice.
let inFlight = null;

// signUp (the sign-up form, incl. password) → { registered: true }. Rejects ACCOUNT_EXISTS, REGISTRATION_FAILED, or the
// transport's NETWORK / TIMEOUT / RATE_LIMITED / SERVER … (a TIMEOUT is ambiguous: MAZ may have created the login).
export function createMazLogin(signUp) {
  if (!inFlight) {
    inFlight = register(signUp).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function register(signUp) {
  let body;
  try {
    body = await post("/register", toApiRegister(signUp), OPTIONS);
  } catch (error) {
    if (error?.code === "VALIDATION") throw apiError(isTaken(error) ? "ACCOUNT_EXISTS" : "REGISTRATION_FAILED");
    throw error;
  }
  if (saysFailed(body)) throw apiError("REGISTRATION_FAILED");
  return { registered: true };
}
