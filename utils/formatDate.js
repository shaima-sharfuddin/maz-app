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
