// The signed-in app is a stack whose first screen is MainTabs (the bottom tab bar). These helpers keep screens from
// caring where a route lives: tab routes are reached THROUGH MainTabs (React Navigation 7 doesn't navigate into a
// nested navigator by name), everything else directly.

export const MAIN_TABS = "MainTabs";
// The routes shown as tabs (App.js) — same names as before they became tabs.
export const TAB_ROUTES = ["HomeDashboard", "ContractList", "MyRequests", "Notifications", "Settings"];

export const isTabRoute = (name) => TAB_ROUTES.includes(name);

// navigation.navigate that also reaches tab routes from any screen (e.g. a notification's target).
export function navigateTo(navigation, name, params) {
  if (isTabRoute(name)) navigation.navigate(MAIN_TABS, { screen: name, params });
  else navigation.navigate(name, params);
}

// The Home tab as a route for navigation.reset({ routes: [homeRoute(), …] }).
export function homeRoute() {
  return { name: MAIN_TABS, state: { routes: [{ name: "HomeDashboard" }] } };
}

// "Back to dashboard": close every stacked screen and show the Home tab (popToTop alone would land on whichever tab
// was open last).
export function goHome(navigation) {
  navigation.popTo(MAIN_TABS, { screen: "HomeDashboard" });
}

// True when the screen is showing as a tab (no Back button there); false when the same screen is pushed on the stack
// (e.g. Settings before the profile is complete).
export function isTabRoot(navigation) {
  return navigation.getState?.()?.type === "tab";
}
