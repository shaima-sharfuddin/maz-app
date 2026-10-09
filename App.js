import "./global.css";
import { useEffect, useMemo } from "react";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import { ThemeProvider, useTheme } from "./theme/ThemeContext";
import { DemoProvider, useDemo } from "./demo/DemoContext";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import WelcomeScreen from "./screens/WelcomeScreen";
import NewUserSignUpScreen from "./screens/NewUserSignUpScreen";
import VerifyAccountScreen from "./screens/VerifyAccountScreen";
import LoginScreen from "./screens/LoginScreen";
import CompleteProfileScreen from "./screens/CompleteProfileScreen";
import HomeDashboardScreen from "./screens/HomeDashboardScreen";
import BrowsePlansScreen from "./screens/BrowsePlansScreen";
import SettingsScreen from "./screens/SettingsScreen";
import EditProfileScreen from "./screens/EditProfileScreen";
import SelectTermScreen from "./screens/SelectTermScreen";
import ReviewRequestScreen from "./screens/ReviewRequestScreen";
import RequestStatusScreen from "./screens/RequestStatusScreen";
import RequestInvoiceScreen from "./screens/RequestInvoiceScreen";
import PaymentReceiptScreen from "./screens/PaymentReceiptScreen";
import PaymentReviewScreen from "./screens/PaymentReviewScreen";
import PaymentFailedScreen from "./screens/PaymentFailedScreen";
import MyRequestsScreen from "./screens/MyRequestsScreen";
import ContractListScreen from "./screens/ContractListScreen";
import ContractDetailScreen from "./screens/ContractDetailScreen";
import PaymentScreen from "./screens/PaymentScreen";
import NotificationsScreen from "./screens/NotificationsScreen";
import SupportScreen from "./screens/SupportScreen";
import NewEnquiryScreen from "./screens/NewEnquiryScreen";
import EnquiryDetailScreen from "./screens/EnquiryDetailScreen";
import MeetingRoomsScreen from "./screens/MeetingRoomsScreen";
import BookMeetingRoomScreen from "./screens/BookMeetingRoomScreen";
import ViolationsScreen from "./screens/ViolationsScreen";
import ViolationDetailScreen from "./screens/ViolationDetailScreen";
import RenewContractScreen from "./screens/RenewContractScreen";
import RenewalStatusScreen from "./screens/RenewalStatusScreen";
import BillViewerScreen from "./screens/BillViewerScreen";

// Keep the splash up until saved state (theme, demo data, login session) has loaded, so the first
// frame never shows the wrong theme, the wrong dashboard state, or the wrong (logged-out) screens.
SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator();

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
      >
        {!isSignedIn ? (
          // Welcome → "New User" (NewUserSignUp → VerifyAccount OTP) or "Existing User" (Login).
          <Stack.Group>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="NewUserSignUp" component={NewUserSignUpScreen} />
            <Stack.Screen name="VerifyAccount" component={VerifyAccountScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </Stack.Group>
        ) : !profileComplete ? (
          <Stack.Group>
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </Stack.Group>
        ) : (
          <Stack.Group>
            <Stack.Screen
              name="HomeDashboard"
              component={HomeDashboardScreen}
              initialParams={{ profileSaved: justCompletedProfile }}
            />
            <Stack.Screen name="BrowsePlans" component={BrowsePlansScreen} />
            <Stack.Screen name="SelectTerm" component={SelectTermScreen} />
            <Stack.Screen name="ReviewRequest" component={ReviewRequestScreen} />
            <Stack.Screen name="RequestStatus" component={RequestStatusScreen} />
            <Stack.Screen name="RequestInvoice" component={RequestInvoiceScreen} />
            <Stack.Screen name="MyRequests" component={MyRequestsScreen} />
            <Stack.Screen name="ContractList" component={ContractListScreen} />
            <Stack.Screen name="ContractDetail" component={ContractDetailScreen} />
            <Stack.Screen name="Payment" component={PaymentScreen} />
            <Stack.Screen name="PaymentReview" component={PaymentReviewScreen} />
            <Stack.Screen name="PaymentReceipt" component={PaymentReceiptScreen} />
            <Stack.Screen name="PaymentFailed" component={PaymentFailedScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Support" component={SupportScreen} />
            <Stack.Screen name="NewEnquiry" component={NewEnquiryScreen} />
            <Stack.Screen name="EnquiryDetail" component={EnquiryDetailScreen} />
            <Stack.Screen name="MeetingRooms" component={MeetingRoomsScreen} />
            <Stack.Screen name="BookMeetingRoom" component={BookMeetingRoomScreen} />
            <Stack.Screen name="Violations" component={ViolationsScreen} />
            <Stack.Screen name="ViolationDetail" component={ViolationDetailScreen} />
            <Stack.Screen name="RenewContract" component={RenewContractScreen} />
            <Stack.Screen name="RenewalStatus" component={RenewalStatusScreen} />
            <Stack.Screen name="BillViewer" component={BillViewerScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
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
