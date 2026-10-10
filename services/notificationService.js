import * as mockNotifications from "./mock/mockNotifications";
import {
  fetchNotifications as fetchNewUserNotifications,
  fetchUnreadCount as fetchNewUserUnreadCount,
  markNotificationRead as markNewUserNotificationRead,
  markAllNotificationsRead as markAllNewUserNotificationsRead,
} from "./mockApi";
import { fetchContracts } from "./contractService";
import { summarizePayments, contractsForAccountPayments, PAYMENT_SUMMARY_NOTE } from "./paymentSummary";
import { getCurrentCustomerId, customerDataSource } from "./customerService";
import { getCurrentSession } from "./authService";
import { describeExpiry, warningStartDate, getExpiryNote } from "./expiryService";
import { SERVICE_SOURCES } from "./serviceConfig";
import { formatBHD } from "../data/pricing";
import { formatDate, toISODate } from "../utils/formatDate";
import { unitWithLocation } from "../utils/formatUnit";

// In-app notifications — the ONLY notifications entry point for screens.
//
// Existing User (a session with a MAZ customer): DEMO notifications, built in the app:
//   • alerts worked out from REAL MAZ data on each load — contract expiry (real end date, confirmed 10-day window,
//     expiryService) and payment due (real installments, provisional paid rule, paymentSummary)
//   • events recorded this session — payment succeeded / failed, renewal submitted / updated (mock provider)
//   • an "account" notice explaining the demo login
// New User: the existing New User mock notifications (mockApi), unchanged.
//
// ⚠️ NOTIFICATIONS PROVIDER: MOCK (services/mock/mockNotifications.js). MAZ sent none of these; no push and no email is
// sent. Emails are only RECORDED as "not_sent" (EMAIL_DELIVERY_AVAILABLE = false). Going live: MAZ generates alerts
// and emails server-side; services/mazNotifications.js lists them / marks them read; switch this line and set
// SERVICE_SOURCES.notifications = "real".
const provider = mockNotifications;

export const NOTIFICATIONS_ARE_DEMO = SERVICE_SOURCES.notifications !== "real";
export const EMAIL_DELIVERY_AVAILABLE = SERVICE_SOURCES.emailDelivery === "real";
export const NOTIFICATIONS_DEMO_NOTE =
  "Demo notifications — simulated in this app, not sent by MAZ. No emails or push notifications are sent.";

const morningOf = (isoDate) => `${isoDate}T09:00:00`;

// Asks for the email that should accompany a notification. No MAZ email service → recorded, never sent.
function requestEmail(notification) {
  const to = getCurrentSession()?.user?.email;
  if (!to) return;
  provider.recordEmail({ notificationId: notification.id, to, subject: notification.title, body: notification.body });
}

// Expiry alerts from the REAL contract end dates. Ended contracts are mentioned only within the same window after
// they ended, so long-expired contracts don't keep notifying.
function expiryAlerts(contracts) {
  return contracts.flatMap((contract) => {
    const { expiry } = contract;
    if (!expiry || !expiry.endDate) return [];
    const unit = unitWithLocation(contract.unit, contract.location);
    if (expiry.state === "expiring") {
      return [
        {
          id: `EXP-${contract.id}`,
          type: "expiry",
          title: `Contract ${contract.id} is approaching expiry`,
          body: `${contract.demo ? "DEMO contract — not MAZ data. " : ""}${unit} · ${describeExpiry(expiry)} (${formatDate(expiry.endDate)}). You can request a renewal from the contract. ${getExpiryNote()}`,
          demoContract: Boolean(contract.demo),
          createdAt: morningOf(warningStartDate(expiry)),
          target: { screen: "ContractDetail", params: { contractId: contract.id } },
        },
      ];
    }
    if (expiry.state === "expired" && expiry.daysLeft < 0 && -expiry.daysLeft <= expiry.thresholdDays) {
      return [
        {
          id: `END-${contract.id}`,
          type: "expiry",
          title: `Contract ${contract.id} has ended`,
          body: `${unit} · ended ${formatDate(expiry.endDate)}. ${getExpiryNote()}`,
          createdAt: morningOf(expiry.endDate),
          target: { screen: "ContractDetail", params: { contractId: contract.id } },
        },
      ];
    }
    return [];
  });
}

// "Payment due" from the REAL installments of the active contracts (provisional paid rule).
function paymentDueAlert(contracts) {
  const summary = summarizePayments(contractsForAccountPayments(contracts));
  if (!(summary.due > 0)) return [];
  const earliest = summary.dueBills.map((bill) => bill.dueDate).sort()[0];
  const count = summary.dueBills.length;
  return [
    {
      id: `DUE-${summary.dueBills.map((bill) => bill.number).sort().join(",")}`,
      type: "bill",
      title: "Payment due",
      body: `${formatBHD(summary.due)} across ${count} ${count === 1 ? "installment" : "installments"}. ${PAYMENT_SUMMARY_NOTE}.`,
      createdAt: morningOf(earliest),
      target: { screen: "PaymentReview", params: { scope: { type: "account" } } },
    },
  ];
}

const accountNotice = (live) => ({
  id: "DEMO-ACCOUNT",
  type: "account",
  title: "Demo account",
  body: live
    ? "These notifications are demo — created in the app from your contract data, not sent by MAZ."
    : "You're signed in with a demo login. The contracts, bills and payments shown are sample data created in the app — not MAZ records — and these notifications are demo.",
  createdAt: `${toISODate(new Date())}T00:00:00`,
  target: { screen: "Settings", params: undefined },
});

async function existingUserNotifications() {
  const contracts = await fetchContracts(); // the session's contracts: live (read only) or the demo tenant's samples
  const live = customerDataSource() === "live";
  const alerts = [...expiryAlerts(contracts), ...paymentDueAlert(contracts)];
  // The email each alert would get — recorded only, and only for a live customer's real contracts (never about sample
  // data or the DEMO contract).
  if (live) alerts.filter((alert) => !alert.demoContract).forEach(requestEmail);
  const notifications = [
    ...provider.listEvents(),
    ...alerts.map((n) => ({ ...n, demo: true, basedOnRealData: live })),
    { ...accountNotice(live), demo: true, basedOnRealData: false },
  ];
  return notifications
    .map((n) => ({ ...n, read: provider.isRead(n.id) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// → [notification], newest first. userState = the dashboard demo state ("tenant" | "newUser").
export async function fetchNotifications(userState = "tenant") {
  if (userState === "newUser") return fetchNewUserNotifications("newUser");
  if (getCurrentCustomerId() == null) return []; // no customer → nothing (never another customer's data)
  return existingUserNotifications();
}

export async function fetchUnreadCount(userState = "tenant") {
  if (userState === "newUser") return fetchNewUserUnreadCount("newUser");
  return { count: (await fetchNotifications(userState)).filter((n) => !n.read).length };
}

// New User notifications keep their old ids ("NTF-…"); everything else is an Existing User demo notification.
export async function markNotificationRead(id) {
  if (id.startsWith("NTF-")) return markNewUserNotificationRead(id);
  provider.markRead(id);
  return { id, read: true };
}

export async function markAllNotificationsRead(userState = "tenant") {
  if (userState === "newUser") return markAllNewUserNotificationsRead("newUser");
  provider.markAllRead((await fetchNotifications(userState)).map((n) => n.id));
  return { read: true };
}

// For other services (payments, renewals): records an in-app event (+ its email, recorded only).
export function recordNotificationEvent(event) {
  const notification = provider.recordEvent(event);
  requestEmail(notification);
  return notification;
}

// The emails that would have been sent (all "not_sent") — for checks / a future debug view.
export const getEmailOutbox = () => provider.getEmailOutbox();
