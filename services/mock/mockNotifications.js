// ⚠️ MOCK NOTIFICATION PROVIDER — DEMO only (Existing User). MAZ has no notifications API and no email service.
// - Event notifications (payment succeeded / failed, renewal submitted / updated, account) are kept in memory for this
//   app session. Alerts worked out from real contract data (expiry, payment due) are built by
//   services/notificationService.js on each load; only their read state is kept here.
// - Nothing is sent: no push notification, no email, no network request. Emails are only RECORDED in an outbox with
//   status "not_sent", so the event → email architecture exists without pretending an email went out.
//
// A real provider (e.g. services/mazNotifications.js — MAZ would generate alerts and emails server-side) must offer:
//   listNotifications() → [notification]   markRead(id)   markAllRead(ids)   isRead(id)
// notification = { id, type, title, body, createdAt (local "YYYY-MM-DDTHH:mm:ss"), target: { screen, params } | null,
//                  demo, basedOnRealData }

const events = []; // newest first
const readIds = new Set();
const emailOutbox = [];

let counter = 0;
const nowISO = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// Records an in-app event notification (session only). Returns it.
export function recordEvent({ type, title, body, target = null }) {
  counter += 1;
  const notification = {
    id: `DEMO-NTF-${Date.now().toString().slice(-6)}-${counter}`,
    type,
    title,
    body,
    createdAt: nowISO(),
    target,
    demo: true,
    basedOnRealData: false,
  };
  events.unshift(notification);
  return { ...notification };
}

export const listEvents = () => events.map((n) => ({ ...n }));
export const isRead = (id) => readIds.has(id);
export function markRead(id) {
  readIds.add(id);
}
export function markAllRead(ids) {
  ids.forEach((id) => readIds.add(id));
}

// The email that WOULD be sent for a notification — recorded, never sent (no MAZ email service).
export function recordEmail({ notificationId, to, subject, body }) {
  if (emailOutbox.some((email) => email.notificationId === notificationId)) return; // once per notification
  emailOutbox.push({ notificationId, to, subject, body, status: "not_sent", reason: "No MAZ email service yet" });
}
export const getEmailOutbox = () => emailOutbox.map((email) => ({ ...email }));
