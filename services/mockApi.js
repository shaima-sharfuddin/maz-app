import { SERVICES, BROWSE_PLAN_IDS } from "../data/brand";
import { MOCK_CONTRACTS, MOCK_TENANT_NAME } from "../data/mockTenant";
import { MOCK_NOTIFICATIONS } from "../data/mockNotifications";
import { MOCK_ENQUIRIES } from "../data/mockEnquiries";
import { MOCK_VIOLATIONS } from "../data/mockViolations";
import { PAYMENT_METHODS } from "../data/paymentMethods";
import {
  formatBHD,
  formatTerm,
  firstInvoice,
  paymentFrequencyLabel,
  DEFAULT_LEASE_MONTHS,
} from "../data/pricing";
import { CONTRACT_STATUS } from "../data/enums";
import { MEETING_ROOMS, OPENING_HOUR, CLOSING_HOUR, DURATION_OPTIONS } from "../data/meetingRooms";
import { toISODate, formatDate, formatTime } from "../utils/formatDate";
import { ApiError } from "./apiError";
import { errorMessage } from "./errorMessages";

// MOCK API — no backend yet. Screens import these via services/api.js; each function has the
// same signature and result shape the real endpoint should have, so swapping is local to /services.
//
// Every call goes through simulate(): a random 800–1200 ms delay, then a random failure
// MOCK_FAILURE_RATE of the time — only while enabled, which is OFF by default so demos behave deterministically.
// Developers turn it on in Settings → Demo data → "Simulate network errors" (hidden unless demo controls are
// enabled — see demo/DemoContext.js).

export const MOCK_FAILURE_RATE = 0.15;
const MIN_LATENCY_MS = 800;
const MAX_LATENCY_MS = 1200;

let failuresEnabled = false;
export function setMockFailuresEnabled(enabled) {
  failuresEnabled = enabled;
}

const RANDOM_FAILURES = [
  new ApiError("NETWORK", "We couldn't reach MAZ. Check your connection and try again."),
  new ApiError("TIMEOUT", "The request took too long. Please try again."),
  new ApiError("SERVER", "Something went wrong on our side. Please try again in a moment."),
];

// Waits, then (maybe) fails at random, then runs `produce`. The random failure is decided BEFORE
// produce() runs, so a failed call never changes mock data (e.g. a failed payment stays unpaid).
// produce() may itself throw an ApiError for rule-based errors (e.g. "Contract not found").
// `instant` skips the latency (e.g. the demo login — its wait was pure demo latency before the dashboard).
function simulate(produce, { canFail = true, instant = false } = {}) {
  const latency = instant ? 0 : MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (canFail && failuresEnabled && Math.random() < MOCK_FAILURE_RATE) {
        const failure = RANDOM_FAILURES[Math.floor(Math.random() * RANDOM_FAILURES.length)];
        reject(new ApiError(failure.code, failure.message));
        return;
      }
      try {
        resolve(produce());
      } catch (error) {
        // An unexpected exception keeps its technical text out of the UI (errorMessage → generic sentence).
        reject(error instanceof ApiError ? error : new ApiError("UNKNOWN", errorMessage(error)));
      }
    }, latency);
  });
}

const clone = (value) => JSON.parse(JSON.stringify(value));
const newId = (prefix) => `${prefix}-${Date.now().toString().slice(-6)}`;

// Local date + time, e.g. "2026-09-27T14:05:00" (same format as the mock data).
const toISODateTime = (date) =>
  `${toISODate(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:00`;

const hourLabel = (hour) => `${String(hour).padStart(2, "0")}:00`;
const daysFromToday = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

// ---- Per-session demo data ---------------------------------------------------
// Everything below starts again from its seed whenever the signed-in account changes or signs out
// (resetSessionMockData, called by services/mock/demoSession.js), so one person's demo actions — a new enquiry, a
// booking, a notification marked read — never show for the next person on the same phone. Screens always receive
// copies, never the stores themselves.
let contracts; // working copy of the mock tenant's contracts (payOutstandingBalance updates it)
let notifications; // per demo account type; actions below push new ones (see pushNotification)
let enquiries; // the tenant's support enquiries, newest first; submitEnquiry adds to it
let bookings; // the tenant's meeting room bookings

function seedSessionData() {
  contracts = clone(MOCK_CONTRACTS);
  notifications = clone(MOCK_NOTIFICATIONS);
  enquiries = clone(MOCK_ENQUIRIES);
  // One upcoming booking is seeded relative to today so the demo always has something to show (and cancel); its
  // confirmation notification is seeded alongside.
  bookings = [
    {
      id: "BKG-4001",
      roomId: "conference-suite",
      roomName: "Conference Suite",
      date: toISODate(daysFromToday(3)),
      start: "10:00",
      end: "12:00",
      durationHours: 2,
      notes: "Quarterly planning",
      status: "confirmed",
    },
  ];
  notifications.tenant.push({
    id: "NTF-1006",
    type: "booking",
    title: "Meeting room booked",
    body: `Conference Suite · ${formatDate(bookings[0].date)}, 10:00 AM – 12:00 PM.`,
    createdAt: toISODateTime(daysFromToday(-1)),
    read: false,
    target: { screen: "MeetingRooms", params: undefined },
  });
}
seedSessionData();

export function resetSessionMockData() {
  seedSessionData();
}

// ---- Per-account demo data ---------------------------------------------------
// Office requests belong to the demo ACCOUNT that submitted them (its sign-in email), not to the phone: another
// account never sees them, and the same account sees them again after logging out and back in (until the app
// reloads — they're in memory). The signed-in account is set by services/mock/demoSession.js on every session change.
let demoAccount = null; // normalised sign-in email, or null when signed out
export function setDemoAccount(accountKey) {
  demoAccount = accountKey ?? null;
}

const requestsByAccount = new Map(); // account → Map(requestId → request), in submission order
// The signed-in account's requests (an empty, unsaved Map when signed out — nothing to read or change).
const accountRequests = () => requestsByAccount.get(demoAccount) ?? new Map();

// Adds a notification to the tenant's list, as the backend would after an action (payment, booking, …).
function pushNotification({ type, title, body, target = null }) {
  notifications.tenant.unshift({
    id: newId("NTF"),
    type,
    title,
    body,
    createdAt: toISODateTime(new Date()),
    read: false,
    target,
  });
}

// ---- Auth & profile --------------------------------------------------------

// New User demo accounts, by email: created this session, or restored at launch (restoreDemoAccounts below). Any other
// email logs in as an existing tenant with a completed profile, so demos can skip sign-up.
const registeredUsers = new Map(); // email → { email, fullName, phone, companyName?, activity, verified, profileComplete }
// New User quick sign-ups, by email: the full form, kept for later reuse (cleared on app reload).
const quickSignUps = new Map();
const emailKey = (email) => email.trim().toLowerCase();

// ---- Demo New User accounts, remembered across app restarts ----------------------------------------------------
// The accounts above live in memory. Without this, a New User who signed up before an app restart would be unknown to
// logIn — and come back as the demo tenant "Sara" with MAZ's demo customer (services/mock/mockCustomerIdentity.js).
// auth/AuthContext.js saves this list encrypted (SecureStore) and restores it at launch, before any login.
// Only the non-sensitive account fields are kept: email, name, company, activity, verified, profileComplete — NEVER the
// mobile number, nationality or CPR / passport number (those stay in quickSignUps, in memory only).
export const MAX_REMEMBERED_ACCOUNTS = 10;
const accountListeners = new Set();

// Whether this app run KNOWS the remembered accounts: "pending" (not read yet) | "ready" | "unavailable" (the phone's
// storage couldn't be read). Until "ready", nobody can log in: an email that isn't known could be a remembered New
// User, and treating it as the demo tenant would show a MAZ customer's data to them. logIn re-reads first
// (ensureDemoAccountsLoaded), so the Login screen's "Try again" recovers once storage works. Sign-up doesn't depend on
// it (a brand-new account is a New User by definition).
let demoAccountsState = "pending";
let demoAccountsLoader = null; // async () → saved list | null — set by auth/AuthContext.js (SecureStore)
export const demoAccountsStatus = () => demoAccountsState;
export function setDemoAccountsLoader(loader) {
  demoAccountsLoader = loader;
}

// Reads the saved list (if not known yet). Never rejects: the outcome is demoAccountsStatus(). Accounts created in this
// run before the list could be read are merged in and saved again.
export async function loadDemoAccounts() {
  if (demoAccountsState === "ready") return;
  if (!demoAccountsLoader) {
    demoAccountsState = "unavailable";
    return;
  }
  try {
    const saved = await demoAccountsLoader();
    if (saved != null && !Array.isArray(saved)) throw new Error("Saved demo accounts are malformed");
    const savedEmails = new Set((saved ?? []).map((account) => (typeof account?.email === "string" ? emailKey(account.email) : null)));
    const unsaved = [...registeredUsers.keys()].some((key) => !savedEmails.has(key));
    restoreDemoAccounts(saved ?? []);
    if (unsaved) demoAccountsChanged();
  } catch {
    demoAccountsState = "unavailable";
  }
}

export const ACCOUNT_CHECK_FAILED_MESSAGE =
  "We couldn't check the demo accounts saved on this phone, so you can't log in safely right now. Please try again — or sign up again.";

// For logIn: the remembered accounts must be known before an email can be matched to an identity.
export async function ensureDemoAccountsLoaded() {
  await loadDemoAccounts();
  if (demoAccountsState !== "ready") throw new ApiError("ACCOUNT_CHECK_FAILED", ACCOUNT_CHECK_FAILED_MESSAGE);
}

// → [{ email, name, companyName, activity, verified, profileComplete }], at most MAX_REMEMBERED_ACCOUNTS (newest kept).
export function exportDemoAccounts() {
  return [...registeredUsers.values()].slice(-MAX_REMEMBERED_ACCOUNTS).map((user) => ({
    email: user.email,
    name: user.fullName,
    companyName: user.companyName ?? null,
    activity: user.activity ?? null,
    verified: Boolean(user.verified),
    profileComplete: user.profileComplete !== false,
  }));
}

// listener(accounts) runs after every change (sign-up, verification, profile edit). Returns an unsubscribe function.
export function onDemoAccountsChange(listener) {
  accountListeners.add(listener);
  return () => accountListeners.delete(listener);
}

function demoAccountsChanged() {
  // Not saved until the stored list has been read — saving now would overwrite it with only this run's accounts.
  if (demoAccountsState !== "ready") return;
  const accounts = exportDemoAccounts();
  accountListeners.forEach((listener) => {
    try {
      listener(accounts);
    } catch {
      // saving is best effort — never breaks the sign-up itself
    }
  });
}

// The saved list (from exportDemoAccounts) → known accounts again, and the list counts as read ("ready"). Malformed
// entries are skipped; an account already known in this app run keeps its newer in-memory record.
export function restoreDemoAccounts(accounts) {
  if (!Array.isArray(accounts)) return;
  demoAccountsState = "ready";
  for (const account of accounts) {
    if (typeof account?.email !== "string" || !account.email.trim()) continue;
    const key = emailKey(account.email);
    if (registeredUsers.has(key)) continue;
    registeredUsers.set(key, {
      email: account.email.trim(),
      fullName: typeof account.name === "string" ? account.name : "",
      phone: null,
      companyName: account.companyName ?? null,
      activity: account.activity ?? null,
      verified: account.verified === true,
      profileComplete: account.profileComplete !== false,
    });
  }
}

// A restored New User session (customerId null) whose account isn't known — e.g. saved before this list existed —
// is added, so logging out and back in keeps it a New User instead of the demo tenant.
export function rememberDemoAccount(user) {
  if (!user?.email || registeredUsers.has(emailKey(user.email))) return;
  registeredUsers.set(emailKey(user.email), {
    email: user.email.trim(),
    fullName: user.name ?? "",
    phone: null,
    companyName: user.companyName ?? null,
    activity: user.activity ?? null,
    verified: true, // it had a signed-in session, so it was verified
    profileComplete: true,
  });
  demoAccountsChanged();
}

// True for a New User demo account (signed up in this app, now or before a restart) — never a MAZ customer. (Only
// complete once demoAccountsStatus() is "ready" — logIn checks that first.)
export function isDemoNewUserAccount(email) {
  return Boolean(email) && registeredUsers.has(emailKey(email));
}

// ⚠️ MOCK — the real backend emails a random code. This fixed code is shown on the Verify screen.
export const MOCK_OTP_CODE = "123456";

// payload: { email, code } → { verified: true, session? }. For a New User sign-up the result also carries
// the session ({ token, user }), so the app signs them in straight after verifying — no separate log in.
export function verifyEmail(payload) {
  return simulate(() => {
    if (payload.code !== MOCK_OTP_CODE) throw new ApiError("INVALID_CODE", "That code isn't right. Check your email and try again.");
    const user = registeredUsers.get(emailKey(payload.email));
    if (user) {
      user.verified = true;
      demoAccountsChanged();
    }
    const quick = quickSignUps.get(emailKey(payload.email));
    return quick ? { verified: true, session: quickSession(quick) } : { verified: true };
  });
}

// email → { sent: true }
export function resendVerificationCode(email) {
  return simulate(() => ({ sent: true, email }));
}

// payload: { email, password } → { token, user: { email, name, companyName, activity, profileComplete } }
// (activity: the sign-up Activity of a New User account; null for everyone else)
// Dev shortcut: the password "wrong" always fails with INVALID_CREDENTIALS, to test that error.
export function logIn(payload) {
  return simulate(() => {
    if (payload.password === "wrong") throw new ApiError("INVALID_CREDENTIALS", "Incorrect email or password.");
    const registered = registeredUsers.get(emailKey(payload.email));
    if (registered && !registered.verified) {
      throw new ApiError("EMAIL_NOT_VERIFIED", "Please verify your email before logging in.");
    }
    return {
      token: newId("TKN"),
      user: {
        email: payload.email.trim(),
        name: registered ? registered.fullName : MOCK_TENANT_NAME,
        companyName: registered?.companyName ?? null,
        activity: registered?.activity ?? null,
        profileComplete: registered ? registered.profileComplete : true,
      },
    };
  }, { instant: true });
}

// The session a verified New User sign-up gets — the same shape as logIn's.
const quickSession = (record) => ({
  token: newId("TKN"),
  user: {
    customerId: null, // a New User demo account never has a MAZ customer
    identity: "newUser",
    email: record.email,
    name: record.customerName,
    companyName: record.companyName,
    activity: record.activity,
    profileComplete: true,
  },
});

// New User sign-up (the client's short form, replacing the old SignUp + CompleteProfile).
// payload: { companyName, customerName, activity, email, countryCode, phoneNumber, phoneCountry, nationality,
// cprNumber | passportNumber, remarks } → { email }. activity is the chosen label (MAZ's GET /activities or the samples). The mobile
// is kept as the dial code ("+971") + national number.
// ⚠️ LOCAL / DEMO: kept in memory and NOT sent to MAZ (SERVICE_SOURCES.customerRegistration = "mock"). Going live needs
// MAZ's POST /customers contract — request fields, required ones, validation + success response (with the new
// customer id) and duplicate handling — then a real provider behind the same function name.
// The account starts UNVERIFIED: the app goes on to VerifyAccount (code MOCK_OTP_CODE), whose verifyEmail
// returns the session. Logging in before verifying fails with EMAIL_NOT_VERIFIED; afterwards it returns the
// same name and company.
export function quickSignUp(payload) {
  return simulate(() => {
    const email = payload.email.trim();
    const record = {
      companyName: payload.companyName.trim(),
      customerName: payload.customerName.trim(),
      activity: payload.activity || null,
      email,
      countryCode: payload.countryCode,
      phoneNumber: payload.phoneNumber,
      phoneCountry: payload.phoneCountry, // ISO code — +1 / +44 / +7 are shared by several countries
      nationality: payload.nationality,
      // Only the ID that applies to the nationality is kept.
      cprNumber: payload.cprNumber?.trim() || null,
      passportNumber: payload.passportNumber?.trim() || null,
      remarks: payload.remarks?.trim() || null,
      createdAt: toISODateTime(new Date()),
    };
    quickSignUps.set(emailKey(email), record);
    registeredUsers.delete(emailKey(email)); // re-inserted last, so it's among the accounts remembered
    registeredUsers.set(emailKey(email), {
      email,
      fullName: record.customerName,
      phone: `${record.countryCode} ${record.phoneNumber}`,
      companyName: record.companyName,
      activity: record.activity,
      verified: false,
      profileComplete: true,
    });
    demoAccountsChanged();
    return { email };
  });
}

// Best effort: logging out locally must never be blocked by the network, so this never fails.
export function logOut() {
  return simulate(() => ({ loggedOut: true }), { canFail: false });
}

// email → { sent: true }
export function requestPasswordReset(email) {
  return simulate(() => ({ sent: true, email }));
}

// Saved Create Customer profiles by customer id (cleared on app reload).
const savedProfiles = new Map();

// payload: { email, customer, owner } (the Create Customer form) → { customerId }.
// owner.ownerType is an OwnerTypeEnum code ("o" Owner, "p" Partner … — data/enums.js).
export function saveProfile(payload) {
  return simulate(() => {
    const customerId = newId("CUS");
    savedProfiles.set(customerId, {
      email: payload?.email ?? null,
      customer: clone(payload?.customer ?? {}),
      owner: clone(payload?.owner ?? {}),
    });
    const user = payload?.email ? registeredUsers.get(emailKey(payload.email)) : null;
    if (user) {
      user.profileComplete = true;
      demoAccountsChanged();
    }
    return { customerId };
  });
}

// ⚠️ MOCK — profile edits from EditProfile, by sign-in email (cleared on app reload). The real save will be
// PUT /customers/{id} once the recruiter confirms its fields. Only the non-sensitive account fields are kept and
// returned here: { companyName, customerName, email } — never nationality or the CPR / passport number.
const profileEdits = new Map();
const PROFILE_FIELDS = ["companyName", "customerName", "email"];
const copyProfile = (values) => Object.fromEntries(PROFILE_FIELDS.map((key) => [key, values?.[key] ?? ""]));

// (email, { companyName, customerName }) → { email }. A New User's stored account follows the edit, so logging
// in again returns the new name and company.
export function updateProfile(email, values) {
  return simulate(() => {
    const saved = {
      email,
      companyName: values.companyName.trim(),
      customerName: values.customerName.trim(),
    };
    profileEdits.set(emailKey(email), saved);
    const registered = registeredUsers.get(emailKey(email));
    if (registered) {
      registered.fullName = saved.customerName;
      registered.companyName = saved.companyName;
      demoAccountsChanged();
    }
    return { email };
  });
}

// The edits saved this session for an account, or null. Synchronous (no latency) — read by
// httpApi.fetchProfile, which otherwise pre-fills from the sign-up record or the session.
export function mockProfileEdits(email) {
  const saved = email ? profileEdits.get(emailKey(email)) : null;
  return saved ? copyProfile(saved) : null;
}

// The company / name / email a New User entered at sign-up this session (quickSignUp), or null (existing tenants,
// or after an app reload cleared the mock store). The sign-up's ID fields are not returned. Synchronous.
export function mockSignUpProfile(email) {
  const record = email ? quickSignUps.get(emailKey(email)) : null;
  return record ? copyProfile(record) : null;
}

// ---- Plans & requests ------------------------------------------------------

// Only the services Browse Plans offers, in BROWSE_PLAN_IDS order (Startup Incubator is hidden, not deleted).
export function fetchPlans() {
  return simulate(() => clone(BROWSE_PLAN_IDS.map((id) => SERVICES.find((service) => service.id === id)).filter(Boolean)));
}

// ⚠️ PLACEHOLDER — the unit MAZ "assigns" at step 4 in the demo (the admin picks the real one).
const PLACEHOLDER_ASSIGNED_UNIT = "Office 312";
const INVOICE_STEP = 5; // "Invoice Generated" in REQUEST_STEPS
const INVOICE_DUE_DAYS = 7;

// payload: { fullName, email, companyName, activity, remark, termMonths, paymentFrequency, summary } → { requestId }
// paymentFrequency is an INSTALLMENTS code ("12" Monthly … "1" Yearly).
// A request starts at step 1. The real backend moves it through the stages; in the demo,
// advanceRequestStage does (RequestStatus shows a demo control for it).
// The request is stored under the signed-in demo account (see setDemoAccount) — never in a store shared by everyone.
export function submitRequest(payload) {
  return simulate(() => {
    if (!demoAccount) throw new ApiError("NO_SESSION", "Please log in again to submit your request.");
    if (!requestsByAccount.has(demoAccount)) requestsByAccount.set(demoAccount, new Map());
    const requestId = newId("REQ");
    const submittedAt = toISODateTime(new Date());
    requestsByAccount.get(demoAccount).set(requestId, {
      requestId,
      payload: clone(payload),
      summary: clone(payload.summary),
      termMonths: payload.termMonths ?? DEFAULT_LEASE_MONTHS,
      paymentFrequency: payload.paymentFrequency ?? null,
      submittedAt,
      currentStep: 1,
      // When each stage was reached (index = step − 1), for the timeline on RequestStatus.
      stageReachedAt: [submittedAt],
      unit: null, // { name, location } once assigned (step 4)
      invoice: null, // { number, lineItems, amount, issuedOn, dueDate, description } once generated (step 5)
      payment: null, // { method, paidDate, receipt } once the invoice is paid
      contractStatus: null, // CONTRACT_STATUS code of the resulting contract — "b" Reviewing once paid
    });
    return { requestId };
  });
}

// What screens see of a stored request (never the store object itself).
const requestView = (request) => ({
  requestId: request.requestId,
  currentStep: request.currentStep,
  submittedAt: request.submittedAt,
  stageReachedAt: [...request.stageReachedAt],
  summary: clone(request.summary),
  activity: request.payload?.activity ?? null, // a New User's sign-up Activity (SAMPLE option, mock only); null for tenants
  unit: request.unit ? clone(request.unit) : null,
  invoice: request.invoice ? clone(request.invoice) : null,
  payment: request.payment ? clone(request.payment) : null,
  // The contract a paid request turns into, labelled from CONTRACT_STATUS (e.g. "b" → Reviewing).
  contract: request.contractStatus
    ? {
        status: CONTRACT_STATUS[request.contractStatus].label.toLowerCase(),
        label: CONTRACT_STATUS[request.contractStatus].label,
      }
    : null,
});

// → { requestId, currentStep (1-based, indexes REQUEST_STEPS), summary, activity, unit, invoice, payment, contract }.
// An unknown id (e.g. after an app reload cleared the mock store, or another account's request) reports step 1 with
// no details.
export function fetchRequestStatus(requestId) {
  return simulate(() => {
    const request = accountRequests().get(requestId);
    if (!request) {
      return {
        requestId,
        currentStep: 1,
        submittedAt: null,
        stageReachedAt: [],
        summary: null,
        unit: null,
        invoice: null,
        payment: null,
        contract: null,
      };
    }
    return requestView(request);
  });
}

// The tenant's most recent request (the dashboard's "Your office request" card), or null.
export function fetchLatestRequest() {
  return simulate(() => {
    const latest = [...accountRequests().values()].pop();
    return latest ? requestView(latest) : null;
  });
}

// Every request the signed-in account has submitted, newest first (My Requests). Same in-memory store as above —
// cleared on app reload, until the real requests endpoint exists.
export function fetchRequests() {
  return simulate(() => [...accountRequests().values()].reverse().map(requestView));
}

// ⚠️ DEMO ONLY — stands in for MAZ's admin moving the request on. Step 4 assigns a unit; step 5
// issues the first invoice = first installment + deposit (separate line items; recruiter decision),
// due in 7 days. Never fails at random, so the demo control always works.
export function advanceRequestStage(requestId) {
  return simulate(
    () => {
      const request = accountRequests().get(requestId);
      if (!request) throw new ApiError("NOT_FOUND", "Request not found.");
      if (request.currentStep >= INVOICE_STEP) throw new ApiError("FINAL_STAGE", "This request is already at its last stage.");

      request.currentStep += 1;
      request.stageReachedAt.push(toISODateTime(new Date()));
      if (request.currentStep === 4) {
        request.unit = { name: PLACEHOLDER_ASSIGNED_UNIT, location: request.summary?.location ?? null };
      }
      if (request.currentStep === INVOICE_STEP) {
        const issuedOn = new Date();
        const { installment, deposit, total } = firstInvoice(request.paymentFrequency ?? "12", request.termMonths);
        const frequency = paymentFrequencyLabel(request.paymentFrequency);
        request.invoice = {
          number: `INV-${issuedOn.getFullYear()}-${request.requestId.slice(-4)}`,
          lineItems: [
            { label: frequency ? `First installment (${frequency})` : "First installment", amount: installment },
            { label: "Deposit", amount: deposit },
          ],
          amount: total,
          issuedOn: toISODate(issuedOn),
          dueDate: toISODate(daysFromToday(INVOICE_DUE_DAYS)),
          description: `${request.summary?.plan ?? "Office"} · ${formatTerm(request.termMonths)}`,
        };
      }
      return requestView(request);
    },
    { canFail: false }
  );
}

// The request's invoice in the shape PaymentScreen reads for a contract
// ({ outstanding, dueDate, unit, location, bills }) plus invoiceNumber / description / paymentFrequency for its
// "You're paying for" card, so one payment screen serves both.
export function fetchRequestInvoice(requestId) {
  return simulate(() => {
    const request = accountRequests().get(requestId);
    if (!request) throw new ApiError("NOT_FOUND", "Request not found.");
    if (!request.invoice) throw new ApiError("NO_INVOICE", "Your invoice hasn't been issued yet.");
    const { invoice } = request;
    return {
      requestId,
      invoiceNumber: invoice.number,
      description: invoice.description, // "Office Suites · 12 months"
      paymentFrequency: request.summary?.paymentFrequency ?? null,
      outstanding: request.payment ? 0 : invoice.amount,
      dueDate: request.payment ? null : invoice.dueDate,
      unit: request.unit?.name ?? null,
      location: request.unit?.location ?? null,
      // One row per invoice line (installment, deposit), so PaymentScreen lists them separately.
      // `number` is the row's bold title (unique per line), `periodLabel` its caption.
      bills: invoice.lineItems.map((item) => ({
        number: item.label,
        periodLabel: invoice.number,
        amount: item.amount,
        status: request.payment ? "paid" : "due",
      })),
    };
  });
}

// ⚠️ MOCK PAYMENT — nothing is charged. Marks the request's invoice paid and returns a receipt in
// the same shape as payOutstandingBalance (with requestId instead of contractId). Per the recruiter,
// the resulting contract starts as "b" Reviewing. The real contract appears in GET /contracts once MAZ
// creates it — the app can't write to the contracts API yet.
export function payRequestInvoice(requestId, methodId) {
  return simulate(() => {
    const request = accountRequests().get(requestId);
    const method = PAYMENT_METHODS.find((m) => m.id === methodId);
    if (!request) throw new ApiError("NOT_FOUND", "Request not found.");
    if (!method) throw new ApiError("INVALID_METHOD", "Choose a payment method.");
    if (!request.invoice) throw new ApiError("NO_INVOICE", "Your invoice hasn't been issued yet.");
    if (request.payment) throw new ApiError("NOTHING_DUE", "This invoice is already paid.");

    const now = new Date();
    const paidDate = toISODate(now);
    const receipt = `RCP-${paidDate.slice(0, 4)}-${paidDate.slice(5, 7)}${paidDate.slice(8, 10)}-${String(now.getTime()).slice(-4)}`;
    request.payment = { method: method.label, paidDate, receipt };
    request.contractStatus = "b"; // CONTRACT_STATUS.b — Reviewing

    return {
      receipt,
      amount: request.invoice.amount,
      paidDate,
      method: method.label,
      requestId,
      contractId: null,
      unit: [request.unit?.name, request.unit?.location].filter(Boolean).join(" · "),
      bills: [request.invoice.number],
    };
  });
}

// ---- Tenant: dashboard, contracts, payments --------------------------------

// Dashboard figures for features that are still mock (enquiries, bookings, violations). Shared with
// the real fetchDashboard in ./httpApi until those features get endpoints. Synchronous, no latency.
export function mockTenantActivity() {
  return {
    openEnquiries: enquiries.filter((e) => e.status === "open").length,
    nextBooking: upcomingBookings()[0] ?? null,
    openViolations: MOCK_VIOLATIONS.filter((v) => v.status === "open").length,
  };
}

// ⚠️ MOCK PAYMENT — no gateway, nothing is charged. Settles the contract's outstanding balance:
// due bills become paid, the balance clears, and the payment details show this payment.
// The real version will hand off to the confirmed gateway (BenefitPay?) and return its result.
export function payOutstandingBalance(contractId, methodId) {
  return simulate(() => {
    const contract = contracts.find((c) => c.id === contractId);
    const method = PAYMENT_METHODS.find((m) => m.id === methodId);
    if (!contract) throw new ApiError("NOT_FOUND", "Contract not found.");
    if (!method) throw new ApiError("INVALID_METHOD", "Choose a payment method.");
    if (contract.outstanding <= 0) throw new ApiError("NOTHING_DUE", "Nothing to pay on this contract.");

    const now = new Date();
    const paidDate = toISODate(now);
    const receipt = `RCP-${paidDate.slice(0, 4)}-${paidDate.slice(5, 7)}${paidDate.slice(8, 10)}-${String(now.getTime()).slice(-4)}`;
    const amount = contract.outstanding;
    const paidBills = contract.bills.filter((bill) => bill.status === "due");

    paidBills.forEach((bill) => {
      bill.status = "paid";
    });
    contract.outstanding = 0;
    contract.dueDate = null;
    contract.payment = { method: method.label, lastAmount: amount, lastDate: paidDate, receipt };
    if (contract.bill) contract.paidThrough = contract.bill.periodEnd;

    pushNotification({
      type: "payment",
      title: "Payment received",
      body: `Thank you — ${formatBHD(amount)} received for ${contract.unit} (receipt ${receipt}).`,
      target: { screen: "ContractDetail", params: { contractId: contract.id } },
    });

    return {
      receipt,
      amount,
      paidDate,
      method: method.label,
      contractId: contract.id,
      unit: `${contract.unit} · ${contract.location}`,
      bills: paidBills.map((bill) => bill.number),
    };
  });
}

// ---- Notifications ---------------------------------------------------------

// userState: the Settings demo toggle — each mock account type has its own list. Newest first.
export function fetchNotifications(userState = "tenant") {
  return simulate(() =>
    clone(notifications[userState] ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );
}

// → { count } — drives the unread dot on the dashboard bell.
export function fetchUnreadCount(userState = "tenant") {
  return simulate(() => ({ count: (notifications[userState] ?? []).filter((n) => !n.read).length }));
}

export function markNotificationRead(id) {
  return simulate(() => {
    const notification = [...notifications.tenant, ...notifications.newUser].find((n) => n.id === id);
    if (!notification) throw new ApiError("NOT_FOUND", "Notification not found.");
    notification.read = true;
    return { id, read: true };
  });
}

export function markAllNotificationsRead(userState = "tenant") {
  return simulate(() => {
    (notifications[userState] ?? []).forEach((n) => {
      n.read = true;
    });
    return { read: true };
  });
}

// ---- Support enquiries -----------------------------------------------------

// Only the demo tenant has enquiries; a new user starts with none.
export function fetchEnquiries(userState = "tenant") {
  return simulate(() => (userState === "newUser" ? [] : clone(enquiries)));
}

export function fetchEnquiry(enquiryId) {
  return simulate(() => {
    const enquiry = enquiries.find((e) => e.id === enquiryId);
    if (!enquiry) throw new ApiError("NOT_FOUND", "Enquiry not found.");
    return clone(enquiry);
  });
}

// payload: { category, contractId (or null), subject, message } → { enquiryId }
export function submitEnquiry(payload) {
  return simulate(() => {
    const enquiryId = newId("ENQ");
    enquiries.unshift({
      id: enquiryId,
      category: payload.category,
      contractId: payload.contractId ?? null,
      subject: payload.subject.trim(),
      message: payload.message.trim(),
      createdAt: toISODateTime(new Date()),
      status: "open",
      reply: null,
    });
    pushNotification({
      type: "support",
      title: "Enquiry received",
      body: `We've received "${payload.subject.trim()}" and will reply by email and in the app.`,
      target: { screen: "EnquiryDetail", params: { enquiryId } },
    });
    return { enquiryId };
  });
}

// ---- Meeting rooms ---------------------------------------------------------

const bookingStart = (booking) => new Date(`${booking.date}T${booking.start}:00`);
const bookingEnd = (booking) => new Date(`${booking.date}T${booking.end}:00`);

// Confirmed bookings that haven't ended yet, soonest first.
function upcomingBookings() {
  const now = new Date();
  return bookings
    .filter((b) => b.status === "confirmed" && bookingEnd(b) > now)
    .sort((a, b) => bookingStart(a) - bookingStart(b));
}

// Stable pseudo-random number 0–99 for a string, so other tenants' "bookings" don't change between loads.
function stableRandom(text) {
  let hash = 2166136261; // FNV-1a, then a final mix so neighbouring hours don't cluster
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
  hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
  return ((hash ^ (hash >>> 16)) >>> 0) % 100;
}

// Hour-by-hour availability for one room on one date. A slot is unavailable if it's in the past,
// taken by another tenant (pseudo-random ~25%), or covered by one of this tenant's bookings.
function roomSlots(roomId, isoDate) {
  const now = new Date();
  const ownHours = new Set();
  bookings
    .filter((b) => b.status === "confirmed" && b.roomId === roomId && b.date === isoDate)
    .forEach((b) => {
      const first = Number(b.start.slice(0, 2));
      for (let h = first; h < first + b.durationHours; h += 1) ownHours.add(h);
    });

  const slots = [];
  for (let hour = OPENING_HOUR; hour < CLOSING_HOUR; hour += 1) {
    const isPast = new Date(`${isoDate}T${hourLabel(hour)}:00`) <= now;
    const takenByOthers = stableRandom(`${roomId}|${isoDate}|${hour}`) < 25;
    slots.push({ start: hourLabel(hour), available: !isPast && !takenByOthers && !ownHours.has(hour) });
  }
  return slots;
}

export function fetchMeetingRooms() {
  return simulate(() => clone(MEETING_ROOMS));
}

// → { roomId, date, slots: [{ start: "09:00", available }] } — one slot per bookable hour.
export function fetchRoomAvailability(roomId, isoDate) {
  return simulate(() => {
    if (!MEETING_ROOMS.some((r) => r.id === roomId)) throw new ApiError("NOT_FOUND", "Meeting room not found.");
    return { roomId, date: isoDate, slots: roomSlots(roomId, isoDate) };
  });
}

// payload: { roomId, date: "YYYY-MM-DD", start: "HH:00", durationHours, notes } → the booking
export function bookMeetingRoom(payload) {
  return simulate(() => {
    const room = MEETING_ROOMS.find((r) => r.id === payload.roomId);
    if (!room) throw new ApiError("NOT_FOUND", "Meeting room not found.");
    if (!DURATION_OPTIONS.includes(payload.durationHours)) throw new ApiError("INVALID_DURATION", "Choose a valid duration.");

    const firstHour = Number(payload.start.slice(0, 2));
    const slots = roomSlots(room.id, payload.date);
    const needed = slots.slice(firstHour - OPENING_HOUR, firstHour - OPENING_HOUR + payload.durationHours);
    if (firstHour < OPENING_HOUR || needed.length < payload.durationHours || needed.some((s) => !s.available)) {
      throw new ApiError("SLOT_TAKEN", "That time is no longer available. Please choose another slot.");
    }

    const end = hourLabel(firstHour + payload.durationHours);
    const booking = {
      id: newId("BKG"),
      roomId: room.id,
      roomName: room.name,
      date: payload.date,
      start: payload.start,
      end,
      durationHours: payload.durationHours,
      notes: payload.notes?.trim() ?? "",
      status: "confirmed",
    };
    bookings.push(booking);
    pushNotification({
      type: "booking",
      title: "Meeting room booked",
      body: `${room.name} · ${formatDate(booking.date)}, ${formatTime(booking.start)} – ${formatTime(end)}.`,
      target: { screen: "MeetingRooms", params: undefined },
    });
    return clone(booking);
  });
}

// The tenant's upcoming bookings; a new user has none.
export function fetchBookings(userState = "tenant") {
  return simulate(() => (userState === "newUser" ? [] : clone(upcomingBookings())));
}

export function cancelBooking(bookingId) {
  return simulate(() => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) throw new ApiError("NOT_FOUND", "Booking not found.");
    if (booking.status === "cancelled") throw new ApiError("ALREADY_CANCELLED", "This booking is already cancelled.");
    if (bookingStart(booking) <= new Date()) {
      throw new ApiError("TOO_LATE", "This booking has already started and can't be cancelled.");
    }
    booking.status = "cancelled";
    pushNotification({
      type: "booking",
      title: "Booking cancelled",
      body: `${booking.roomName} · ${formatDate(booking.date)}, ${formatTime(booking.start)} – ${formatTime(booking.end)}.`,
      target: { screen: "MeetingRooms", params: undefined },
    });
    return { bookingId, status: "cancelled" };
  });
}
