// The ONLY module screens import API functions from.
// Existing User services (auth, customer identity, …) say in services/serviceConfig.js whether they're REAL,
// MOCK or PROVISIONAL; their explicit re-exports below override the old mock functions of the same name.
// Functions not yet backed by the real API are simulated in ./mockApi. Real endpoints live in
// ./httpApi with the same names and result shapes; the explicit re-exports below take precedence
// over the mock ones from `export *` (standard ES module behaviour), so each function switches
// individually. Screens need no changes.
/* eslint-disable import/export -- intentional: httpApi overrides the matching mockApi exports */
export * from "./mockApi";
export { fetchCustomer, fetchUnits, fetchProfile } from "./httpApi";
export { logIn, logOut, requestPasswordReset, AUTH_IS_MOCK } from "./authService";
export {
  fetchDashboard,
  fetchDashboardActivity,
  fetchTenantName,
  fetchContracts,
  fetchContract,
  summarizeContracts,
  contractAmounts,
} from "./contractService";
export { fetchBill, PAYMENT_STATUS_NOTE } from "./billService";
export {
  PAYMENTS_ARE_DEMO,
  getPaymentMethods,
  preparePayment,
  submitPayment,
  summarizePayments,
  payNowTarget,
  PAYMENT_SUMMARY_NOTE,
} from "./paymentService";
export {
  getExpiryStatus,
  describeExpiry,
  getExpiryNote,
  getExpiryWarningDays,
} from "./expiryService";
export { EXPIRY_WARNING_DAYS } from "./serviceConfig";
export {
  RENEWALS_ARE_DEMO,
  RENEWAL_TERM_OPTIONS,
  RENEWAL_STEPS,
  fetchRenewal,
  renewalEligibility,
  requestRenewal,
  advanceRenewalDemo,
} from "./renewalService";
export {
  NOTIFICATIONS_ARE_DEMO,
  NOTIFICATIONS_DEMO_NOTE,
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "./notificationService";
export {
  VIOLATIONS_ARE_DEMO,
  VIOLATION_TYPES_ARE_REAL,
  DEMO_DATA_LABEL,
  fetchViolations,
  fetchViolation,
  fetchViolationTypes,
} from "./violationService";
export { fetchActivityOptions } from "./activityService";
export { registerNewUser } from "./registrationService";
export { submitSignUpEnquiry, areEnquiriesLive } from "./enquiryService";
/* eslint-enable import/export */
export { ApiError } from "./apiError";
// User-facing wording for a failed load / action (shared with the HTTP transport).
export { errorMessage } from "./errorMessages";
