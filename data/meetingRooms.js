// PLACEHOLDER — sample rooms, hours and durations until MAZ confirms its real meeting rooms, opening
// hours and booking rules (and whether bookings are charged or use included hours).

export const MEETING_ROOMS = [
  {
    id: "marble-boardroom",
    name: "Marble Boardroom",
    capacity: 12,
    description: "Formal boardroom for board meetings, signings and presentations.",
  },
  {
    id: "conference-suite",
    name: "Conference Suite",
    capacity: 8,
    description: "Conference suite for team meetings and client workshops.",
  },
  {
    id: "executive-room",
    name: "Executive Meeting Room",
    capacity: 4,
    description: "Intimate room for interviews and one-to-one meetings.",
  },
];

// Bookable hours: slots start on the hour from OPENING_HOUR up to the last hour before CLOSING_HOUR.
export const OPENING_HOUR = 8;
export const CLOSING_HOUR = 18;
export const DURATION_OPTIONS = [1, 2, 3]; // hours
export const BOOKING_WINDOW_DAYS = 60; // how far ahead a room can be booked

export const formatHours = (hours) => `${hours} ${hours === 1 ? "hour" : "hours"}`;
