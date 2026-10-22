import "./global.css";
import { useEffect, useMemo } from "react";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import { ThemeProvider, useTheme } from "./theme/ThemeContext";
import { DemoProvider, useDemo } from "./demo/DemoContext";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import PageBackground from "./components/PageBackground";
import TabBar from "./components/TabBar";
import { MAIN_TABS } from "./utils/navigation";
import WelcomeScreen from "./screens/WelcomeScreen";
import HomeDashboardScreen from "./screens/HomeDashboardScreen";

// Screens load the first time they're opened (React Navigation getComponent), not at launch: Expo keeps Metro's
// inline requires off, so every eagerly imported screen — with its libraries (WebView, PDF printing, audio …) — ran
// before the first frame. Only the first screen of each session state (Welcome, the Home tab) is imported up front.
const screens = {
  NewUserSignUpScreen: () => require("./screens/NewUserSignUpScreen").default,
  VerifyAccountScreen: () => require("./screens/VerifyAccountScreen").default,
  LoginScreen: () => require("./screens/LoginScreen").default,
  ForgotPasswordScreen: () => require("./screens/ForgotPasswordScreen").default,
  ResetPasswordScreen: () => require("./screens/ResetPasswordScreen").default,
  CompleteProfileScreen: () => require("./screens/CompleteProfileScreen").default,
  BrowsePlansScreen: () => require("./screens/BrowsePlansScreen").default,
  SettingsScreen: () => require("./screens/SettingsScreen").default,
  CommercialRegistrationScreen: () => require("./screens/CommercialRegistrationScreen").default,
  SelectTermScreen: () => require("./screens/SelectTermScreen").default,
  ReviewRequestScreen: () => require("./screens/ReviewRequestScreen").default,
  RequestInvoiceScreen: () => require("./screens/RequestInvoiceScreen").default,
  PaymentReceiptScreen: () => require("./screens/PaymentReceiptScreen").default,
  TapCheckoutScreen: () => require("./screens/TapCheckoutScreen").default,
  PlanDetailScreen: () => require("./screens/PlanDetailScreen").default,
  PaymentResultScreen: () => require("./screens/PaymentResultScreen").default,
  PaymentReviewScreen: () => require("./screens/PaymentReviewScreen").default,
  PaymentFailedScreen: () => require("./screens/PaymentFailedScreen").default,
  MyRequestsScreen: () => require("./screens/MyRequestsScreen").default,
  ContractListScreen: () => require("./screens/ContractListScreen").default,
  InvoicesScreen: () => require("./screens/InvoicesScreen").default,
  ContractDetailScreen: () => require("./screens/ContractDetailScreen").default,
  PaymentScreen: () => require("./screens/PaymentScreen").default,
  NotificationsScreen: () => require("./screens/NotificationsScreen").default,
  SupportScreen: () => require("./screens/SupportScreen").default,
  NewEnquiryScreen: () => require("./screens/NewEnquiryScreen").default,
  EnquiryDetailScreen: () => require("./screens/EnquiryDetailScreen").default,
  ViolationsScreen: () => require("./screens/ViolationsScreen").default,
  ViolationDetailScreen: () => require("./screens/ViolationDetailScreen").default,
  ViolationTypesScreen: () => require("./screens/ViolationTypesScreen").default,
  RenewContractScreen: () => require("./screens/RenewContractScreen").default,
  RenewalStatusScreen: () => require("./screens/RenewalStatusScreen").default,
  BillViewerScreen: () => require("./screens/BillViewerScreen").default,
};

// Keep the splash up until saved state (theme, demo data, login session) has loaded, so the first
// frame never shows the wrong theme, the wrong dashboard state, or the wrong (logged-out) screens.
SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// The signed-in home: the custom bottom tab bar (components/TabBar.js). Tab routes keep the names they had as stack
// screens (utils/navigation.js TAB_ROUTES); every other signed-in screen is pushed on the stack ABOVE the tabs.
// Every screen sits on the app-wide page background (ivory / deep navy + navy glow — components/PageBackground.js);
// screens give their root view colors.canvas (transparent) so it shows through.
const withPageBackground = ({ children }) => <PageBackground>{children}</PageBackground>;

// Every account has a Contracts tab (user, 2026-10-22) — an account with no MAZ customer sees "No contracts yet".
function MainTabs({ route }) {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      backBehavior="history"
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
      screenLayout={withPageBackground}
    >
      <Tab.Screen
        name="HomeDashboard"
        component={HomeDashboardScreen}
        initialParams={route.params?.homeParams}
        options={{ title: "Home", tabIcon: "home-outline", tabIconActive: "home" }}
      />
      <Tab.Screen
        name="ContractList"
        getComponent={screens.ContractListScreen}
        options={{ title: "Contracts", tabIcon: "document-text-outline", tabIconActive: "document-text" }}
      />
      <Tab.Screen
        name="MyRequests"
        getComponent={screens.MyRequestsScreen}
        options={{ title: "Requests", tabIcon: "clipboard-outline", tabIconActive: "clipboard" }}
      />
      <Tab.Screen
        name="Notifications"
        getComponent={screens.NotificationsScreen}
        options={{ title: "Alerts", tabIcon: "notifications-outline", tabIconActive: "notifications" }}
      />
      <Tab.Screen
        name="Settings"
        getComponent={screens.SettingsScreen}
        options={{ title: "Account", tabIcon: "person-circle-outline", tabIconActive: "person-circle" }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { ready: themeReady, isDark, colors } = useTheme();
  const { ready: demoReady } = useDemo();
  const { ready: authReady, isSignedIn, profileComplete, justCompletedProfile } = useAuth();
  const ready = themeReady && demoReady && authReady;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  // Navigation's own surfaces (behind transitions, the root view) follow our palette too.
  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.background,
        text: colors.text,
        border: colors.surfaceBorder,
      },
    };
  }, [isDark, colors]);

  if (!ready) return null;

  // Auth-gated routes: only the screens for the current session state exist, so signing in/out
  // switches screen sets automatically and Back can never reach the other side.
  return (
    <NavigationContainer theme={navigationTheme}>
      {/* One status bar for the whole app: light icons on dark, dark icons on light. */}
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack.Navigator
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
        screenLayout={withPageBackground}
      >
        {!isSignedIn ? (
          // Welcome → "New User" (NewUserSignUp → VerifyAccount OTP) or "Existing User" (Login; "Forgot password?" →
          // ForgotPassword → ResetPassword → Login).
          <Stack.Group>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="NewUserSignUp" getComponent={screens.NewUserSignUpScreen} />
            <Stack.Screen name="VerifyAccount" getComponent={screens.VerifyAccountScreen} />
            <Stack.Screen name="Login" getComponent={screens.LoginScreen} />
            <Stack.Screen name="ForgotPassword" getComponent={screens.ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" getComponent={screens.ResetPasswordScreen} />
          </Stack.Group>
        ) : !profileComplete ? (
          <Stack.Group>
            <Stack.Screen name="CompleteProfile" getComponent={screens.CompleteProfileScreen} />
            <Stack.Screen name="Settings" getComponent={screens.SettingsScreen} />
          </Stack.Group>
        ) : (
          <Stack.Group>
            <Stack.Screen
              name={MAIN_TABS}
              component={MainTabs}
              initialParams={{ homeParams: { profileSaved: justCompletedProfile } }}
            />
            <Stack.Screen name="BrowsePlans" getComponent={screens.BrowsePlansScreen} />
            <Stack.Screen name="PlanDetail" getComponent={screens.PlanDetailScreen} />
            <Stack.Screen name="CommercialRegistration" getComponent={screens.CommercialRegistrationScreen} />
            <Stack.Screen name="SelectTerm" getComponent={screens.SelectTermScreen} />
            <Stack.Screen name="ReviewRequest" getComponent={screens.ReviewRequestScreen} />
            <Stack.Screen name="RequestInvoice" getComponent={screens.RequestInvoiceScreen} />
            <Stack.Screen name="ContractDetail" getComponent={screens.ContractDetailScreen} />
            <Stack.Screen name="Payment" getComponent={screens.PaymentScreen} />
            <Stack.Screen name="PaymentReview" getComponent={screens.PaymentReviewScreen} />
            <Stack.Screen name="PaymentReceipt" getComponent={screens.PaymentReceiptScreen} />
            <Stack.Screen name="PaymentFailed" getComponent={screens.PaymentFailedScreen} />
            {/* Live Tap checkout (WebView) slides up as a full-screen sheet; its result replaces it. */}
            <Stack.Screen
              name="TapCheckout"
              getComponent={screens.TapCheckoutScreen}
              options={{ presentation: "fullScreenModal", animation: "slide_from_bottom", gestureEnabled: false }}
            />
            <Stack.Screen
              name="PaymentResult"
              getComponent={screens.PaymentResultScreen}
              options={{ animation: "fade", gestureEnabled: false }}
            />
            <Stack.Screen name="Support" getComponent={screens.SupportScreen} />
            <Stack.Screen name="NewEnquiry" getComponent={screens.NewEnquiryScreen} />
            <Stack.Screen name="EnquiryDetail" getComponent={screens.EnquiryDetailScreen} />
            <Stack.Screen name="Violations" getComponent={screens.ViolationsScreen} />
            <Stack.Screen name="ViolationDetail" getComponent={screens.ViolationDetailScreen} />
            <Stack.Screen name="ViolationTypes" getComponent={screens.ViolationTypesScreen} />
            <Stack.Screen name="RenewContract" getComponent={screens.RenewContractScreen} />
            <Stack.Screen name="RenewalStatus" getComponent={screens.RenewalStatusScreen} />
            <Stack.Screen name="BillViewer" getComponent={screens.BillViewerScreen} />
            <Stack.Screen name="Invoices" getComponent={screens.InvoicesScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {/* A rendering error anywhere below shows a friendly "Something went wrong" screen, not a crash. */}
        <ErrorBoundary>
          <DemoProvider>
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          </DemoProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
