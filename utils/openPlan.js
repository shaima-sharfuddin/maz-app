// A tapped service (PlanCard on the dashboard / Browse Plans) opens its listing page, PlanDetail (Visual system v2).
// planRoute = where PlanDetail's action goes next: services that need a CR (Office Suites) → the "existing or new CR?"
// question first; others → the lease term. (Meeting Rooms, the only hourly service, was
// removed by the client on 2026-10-14 — its screens are kept but unregistered.)
export function planRoute(plan) {
  if (plan.requiresCr) return { name: "CommercialRegistration", params: { plan } };
  return { name: "SelectTerm", params: { plan } };
}

export function planDetailRoute(plan) {
  return { name: "PlanDetail", params: { plan } };
}

export function openPlan(navigation, plan) {
  const { name, params } = planDetailRoute(plan);
  navigation.navigate(name, params);
}
