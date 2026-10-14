import { post } from "./http/apiClient";
import { toUiAuthSession } from "./apiMappers";
import { ApiError } from "./apiError";
import { ERROR_MESSAGES } from "./errorMessages";
import { issueSession, MAZ_IDENTITY } from "./liveAuth";

// REAL MAZ authentication (Laravel Sanctum-style bearer tokens).
//   POST /login  { username, password } → { message, token, user: { id, name, username, role, company_id, customer_id } }
//                Wrong credentials → 422 { errors: { username: ["Invalid username or password"] } } (checked 2026-10-14)
//   POST /logout (Bearer) → revokes the token
// There is no GET /me and no password-reset endpoint yet.

const failure = (code) => new ApiError(code, ERROR_MESSAGES[code]);

// { email, password } → a verified session { token, user: { email, name, companyName, customerId, identity, … },
// profileComplete }. The login is sent WITHOUT any stored token. Rejects with ApiError: INVALID_CREDENTIALS (MAZ said
// no), INVALID_RESPONSE (no token / user in a 2xx answer) or a transport error (NETWORK, TIMEOUT, SERVER …).
export async function logIn({ email, password }) {
  const username = email.trim();
  let body;
  try {
    body = await post("/login", { username, password }, { skipAuth: true });
  } catch (error) {
    if (["VALIDATION", "NOT_AUTHORIZED", "BAD_REQUEST"].includes(error?.code)) throw failure("INVALID_CREDENTIALS");
    throw error;
  }
  const session = toUiAuthSession(body, { email: username });
  if (!session) throw failure("INVALID_RESPONSE");
  return issueSession({ ...session, user: { ...session.user, identity: MAZ_IDENTITY } });
}

// Revokes the current token with MAZ. Best effort: never rejects, and a 401 here (token already expired) doesn't
// trigger the session-expired sign-out — the app is signing out anyway.
export async function logOut() {
  try {
    await post("/logout", {}, { skipUnauthorizedHandler: true });
  } catch {
    // signing out locally must never be blocked by the network
  }
  return { loggedOut: true };
}
