// Phase 2 follow-up (2026-10-10): if the phone's saved demo accounts (SecureStore maz.demoAccounts) can't be read, the
// app must NOT guess — an unknown email could be a remembered New User, and the guess (the demo tenant) would show them
// a MAZ customer's data. logIn fails safely with ACCOUNT_CHECK_FAILED (Login shows it with "Try again", which re-reads);
// sign-up keeps working; nothing is overwritten; once storage works again, everything recovers.
//
// This file deliberately doesn't use tests/helpers.mjs, which marks the saved list as read: here it starts unread, as
// at app launch. Each test file runs in its own process, so the module state is fresh. The tests run in order.
import { test } from "node:test";
import assert from "node:assert/strict";

const calls = [];
globalThis.fetch = async (url) => {
  calls.push(String(url));
  throw new Error(`No request should be made in these tests: ${url}`);
};

const api = await import("../services/api.js");
const auth = await import("../services/authService.js");
const { demoAccountsStatus, MOCK_OTP_CODE, onDemoAccountsChange } = await import("../services/mockApi.js");

const signUpPayload = (email) => ({
  companyName: "Saved Co",
  customerName: "Saved Person",
  activity: null,
  email,
  countryCode: "+973",
  phoneNumber: "36123456",
  phoneCountry: "BH",
  nationality: "Bahrain",
  cprNumber: "880112345",
  passportNumber: "",
});

const REMEMBERED = "remembered.newuser@example.com";
let storage = { fail: true, value: null }; // the fake SecureStore behind the loader
const saves = [];
onDemoAccountsChange((accounts) => saves.push(accounts));

test("before the saved accounts are read, nobody can log in", async () => {
  assert.equal(demoAccountsStatus(), "pending");
  await assert.rejects(auth.logIn({ email: "anyone@example.com", password: "x" }), { code: "ACCOUNT_CHECK_FAILED" });
});

test("SecureStore read fails → logins fail safely (no identity guessed), with a message to try again", async () => {
  auth.setDemoAccountsLoader(async () => {
    if (storage.fail) throw new Error("Keystore unavailable");
    return storage.value === null ? null : JSON.parse(storage.value);
  });
  await auth.loadDemoAccounts(); // what AuthContext does at launch — never rejects
  assert.equal(demoAccountsStatus(), "unavailable");

  for (const email of [REMEMBERED, "sara.tenant@example.com"]) {
    const error = await auth.logIn({ email, password: "x" }).catch((e) => e);
    assert.equal(error.code, "ACCOUNT_CHECK_FAILED", `${email} must not be given an identity`);
    assert.match(api.errorMessage(error), /try again/i, "Login's banner tells the user what to do");
  }
  assert.equal(calls.length, 0, "no request to MAZ — no customer data was loaded");
});

test("while unreadable, sign-up still works (always a New User) and the saved list isn't overwritten", async () => {
  const email = "signed.up.meanwhile@example.com";
  await api.quickSignUp(signUpPayload(email));
  const { session } = await api.verifyEmail({ email, code: MOCK_OTP_CODE });
  assert.equal(session.user.customerId, null);
  assert.equal(session.user.identity, "newUser");
  assert.equal(saves.length, 0, "nothing saved while the stored list is unknown (it would replace it)");
});

test("malformed saved data also fails safely", async () => {
  storage = { fail: false, value: "{not json" };
  await assert.rejects(auth.logIn({ email: REMEMBERED, password: "x" }), { code: "ACCOUNT_CHECK_FAILED" });
  storage = { fail: false, value: JSON.stringify({ email: REMEMBERED }) }; // not a list
  await assert.rejects(auth.logIn({ email: REMEMBERED, password: "x" }), { code: "ACCOUNT_CHECK_FAILED" });
  assert.equal(demoAccountsStatus(), "unavailable");
});

test("'Try again' once storage works: the remembered New User is a New User; accounts made meanwhile are kept", async () => {
  storage = {
    fail: false,
    value: JSON.stringify([{ email: REMEMBERED, name: "Remembered", companyName: "R Co", activity: null, verified: true, profileComplete: true }]),
  };
  const login = await auth.logIn({ email: REMEMBERED, password: "x" });
  assert.equal(demoAccountsStatus(), "ready");
  assert.equal(login.user.customerId, null, "never customer 1");
  assert.equal(login.user.identity, "newUser");
  assert.equal(login.user.name, "Remembered");

  // The account signed up while storage was unreadable was merged in and saved, alongside the restored one.
  const lastSave = saves.at(-1).map((account) => account.email).sort();
  assert.deepEqual(lastSave, [REMEMBERED, "signed.up.meanwhile@example.com"].sort());

  // Everyone else is the demo tenant again, as before (recruiter testing).
  const tenant = await auth.logIn({ email: "sara.tenant@example.com", password: "x" });
  assert.equal(tenant.user.identity, "demoTenant");
  assert.equal(calls.length, 0);
});
