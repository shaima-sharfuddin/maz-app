import {
  logIn as demoLogIn,
  logOut as demoLogOut,
  requestPasswordReset as demoPasswordReset,
  restoreDemoAccounts,
  onDemoAccountsChange,
  rememberDemoAccount,
  ensureDemoAccountsLoaded,
  loadDemoAccounts,
  setDemoAccountsLoader,
  isDemoNewUserAccount,
} from "../mockApi";
import { identityForDemoLogin } from "./mockCustomerIdentity";

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
//   logIn({ email, password }) → { token, user: { email, name, companyName, profileComplete, customerId, identity } }
//   (identity: which kind of account — only identities listed in services/customerService.js may load customer data)
//   logOut() → resolves (best effort)      requestPasswordReset(email) → { sent: true, email }
// and reject with ApiError (e.g. "INVALID_CREDENTIALS", "EMAIL_NOT_VERIFIED") for the screens' error states.

// Fails safely with ACCOUNT_CHECK_FAILED (Login shows it with "Try again") while the remembered demo accounts can't be
// read — never guesses an identity.
export async function logIn(credentials) {
  await ensureDemoAccountsLoaded();
  const result = await demoLogIn(credentials);
  return { ...result, user: { ...result.user, ...identityForDemoLogin(result.user) } };
}

export const logOut = () => demoLogOut();

export const requestPasswordReset = (email) => demoPasswordReset(email);

// Demo New User accounts remembered across app restarts (mockApi) — so a New User who logs in after a restart is still
// a New User, never MAZ's demo customer. Saved / restored by auth/AuthContext.js via services/authService.js.
export const restoreAccounts = (accounts) => restoreDemoAccounts(accounts);
export const onAccountsChange = (listener) => onDemoAccountsChange(listener);
export const rememberAccount = (user) => rememberDemoAccount(user);
export const setAccountsLoader = (loader) => setDemoAccountsLoader(loader);
export const loadAccounts = () => loadDemoAccounts();
export const isNewUserAccount = (email) => isDemoNewUserAccount(email);
