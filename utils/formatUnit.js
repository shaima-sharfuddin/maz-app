// "Office 204 · Seef District", or just "INC 009" when the location is unknown (real API data).
export function unitWithLocation(unit, location) {
  return [unit, location].filter(Boolean).join(" · ") || "Unit to be confirmed";
}
