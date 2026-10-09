import { logIn as demoLogIn, logOut as demoLogOut, requestPasswordReset as demoPasswordReset } from "../mockApi";
import { customerIdForDemoLogin } from "./mockCustomerIdentity";

// ⚠️ MOCK AUTH PROVIDER — not real authentication. MAZ has no login endpoint yet.
// - logIn: any email + any password succeeds (the password "wrong" fails, to test the error state). The
//   token is a made-up string and is never sent to MAZ (services/authService.js only sends tokens from a
//   real provider).
// - requestPasswordReset: nothing is emailed.
// - logOut: local only.
// The demo account logic itself lives in mockApi.js (shared with the New User sign-up mock); this file adds
// the session's customer id (mockCustomerIdentity.js).
//
// A real provider must export the same functions and return the same shapes:
//   logIn({ email, password }) → { token, user: { email, name, companyName, profileComplete, customerId } }
//   logOut() → resolves (best effort)      requestPasswordReset(email) → { sent: true, email }
// and reject with ApiError (e.g. "INVALID_CREDENTIALS", "EMAIL_NOT_VERIFIED") for the screens' error states.

export async function logIn(credentials) {
  const result = await demoLogIn(credentials);
  return { ...result, user: { ...result.user, customerId: customerIdForDemoLogin(result.user) } };
}

export const logOut = () => demoLogOut();

export const requestPasswordReset = (email) => demoPasswordReset(email);
