const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "05 Mar 2027". Accepts a Date or an ISO date string ("2027-03-05").
export function formatDate(value) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  const day = String(date.getDate()).padStart(2, "0");
  return `${day} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// "Oct 2026"
export function formatMonth(value) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// "14:05" → "2:05 PM"
export function formatTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

// Local date-time string ("2026-09-26T14:05:00") → "Today, 2:05 PM" / "Yesterday, 2:05 PM" / "24 Sep 2026".
export function formatTimestamp(value) {
  const [datePart, timePart = "00:00"] = value.split("T");
  const date = new Date(`${datePart}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysAgo = Math.round((today - date) / 86400000);
  if (daysAgo === 0) return `Today, ${formatTime(timePart.slice(0, 5))}`;
  if (daysAgo === 1) return `Yesterday, ${formatTime(timePart.slice(0, 5))}`;
  return formatDate(datePart);
}

// Local calendar date as "YYYY-MM-DD" (not toISOString, which is UTC and can be a day off in Bahrain, UTC+3).
export function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
