import { useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import SegmentedControl from "../components/SegmentedControl";
import AnimatedButton from "../components/AnimatedButton";
import HeroPanel from "../components/HeroPanel";
import SectionHeading from "../components/SectionHeading";
import PressableScale from "../components/PressableScale";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";
import { TYPE } from "../theme/theme";
import FadeIn from "../components/FadeIn";
import { useDemo, DEMO_CONTROLS_ENABLED } from "../demo/DemoContext";
import { useAuth, useAccountState } from "../auth/AuthContext";
import { isTabRoot } from "../utils/navigation";

const APPEARANCE_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const ON_OFF_OPTIONS = [
  { value: "on", label: "On" },
  { value: "off", label: "Off" },
];

// Up to two initials for the profile avatar ("Sara Ahmed" → "SA", "sara@…" → "S").
function initialsOf(text) {
  const words = String(text ?? "").replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0].toUpperCase()).join("") || "?";
}

export default function SettingsScreen({ navigation }) {
  const { colors, preference, setPreference, scheme } = useTheme();
  const { simulateErrors, setSimulateErrors, startAtWelcome, setStartAtWelcome } = useDemo();
  const userState = useAccountState();
  // No "Edit profile" (removed by the client, 2026-10-14): the account card only shows who is signed in + Log out.
  const { user, signOut, profileComplete } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  // Logging out switches the navigator back to Welcome (App.js), so no navigate() is needed.
  const confirmLogOut = () => {
    Alert.alert("Log out?", "You'll need to log in again to see your contracts and payments.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          await signOut();
        },
      },
    ]);
  };

  const card = useCardStyle();
  const cardStyle = { ...card, padding: 16, paddingBottom: 0 };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.canvas }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          {isTabRoot(navigation) ? null : <BackButton onPress={() => navigation.goBack()} />}

          <ScreenTitle title="Settings" subtitle="Tailor your MAZ experience." />

          {user ? (
            <FadeIn>
              <SectionHeading>Account</SectionHeading>
              {/* Profile panel: who's signed in, on the brand navy surface. */}
              <HeroPanel style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", paddingRight: 64 }}>
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      backgroundColor: colors.heroGlass,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 14,
                    }}
                  >
                    <Text style={{ color: colors.onHero, fontSize: 18, fontWeight: "700", letterSpacing: 0.5 }}>
                      {initialsOf(user.name || user.email)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[TYPE.caption, { color: colors.onHeroMuted }]}>Logged in as</Text>
                    <Text style={[TYPE.cardTitle, { color: colors.onHero, fontSize: 17, marginTop: 2 }]}>
                      {user.name || user.email}
                    </Text>
                    {user.name ? (
                      <Text style={{ color: colors.onHeroMuted, fontSize: 13, marginTop: 2 }}>{user.email}</Text>
                    ) : null}
                  </View>
                </View>
              </HeroPanel>
              <View style={{ marginTop: 12, marginBottom: 32 }}>
                <AnimatedButton
                  label={loggingOut ? "Logging out…" : "Log out"}
                  variant="secondary"
                  loading={loggingOut}
                  onPress={confirmLogOut}
                />
              </View>
            </FadeIn>
          ) : null}

          {/* Billing — the Invoices list (user, 2026-10-22). Only in the full signed-in app (the !profileComplete group
              doesn't register Invoices). */}
          {user && profileComplete ? (
            <FadeIn index={1}>
              <SectionHeading>Billing</SectionHeading>
              <PressableScale
                onPress={() => navigation.navigate("Invoices")}
                scaleTo={0.98}
                accessibilityRole="button"
                accessibilityLabel="Invoices. Every invoice for your office and contracts"
                containerStyle={{ marginBottom: 32 }}
                style={[card, { flexDirection: "row", alignItems: "center", padding: 16, minHeight: 64 }]}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.primarySoft,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Ionicons name="receipt-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[TYPE.cardTitle, { color: colors.text }]}>Invoices</Text>
                  <Text style={[TYPE.caption, { color: colors.textMuted, marginTop: 2 }]}>
                    Every invoice for your office and contracts
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </PressableScale>
            </FadeIn>
          ) : null}

          <FadeIn index={1}>
            <SectionHeading>Appearance</SectionHeading>
            <View style={[cardStyle, { marginBottom: 32 }]}>
              <SegmentedControl
                label="Theme"
                value={preference}
                onChange={setPreference}
                options={APPEARANCE_OPTIONS}
              />
              {preference === "system" ? (
                <Text className="text-sm leading-5 mb-4" style={{ color: colors.textMuted, marginTop: -8 }}>
                  Matches your phone&apos;s setting (currently {scheme === "dark" ? "dark" : "light"}).
                </Text>
              ) : null}
            </View>
          </FadeIn>

          {/* DEMO ONLY — developer controls, hidden from normal users (DEMO_CONTROLS_ENABLED, demo/DemoContext.js).
              Remove this section once real account data comes from the backend. */}
          {DEMO_CONTROLS_ENABLED ? (
            <>
              <SectionHeading>Demo data</SectionHeading>
              <View style={cardStyle}>
                {/* Read-only: the dashboard follows the signed-in account (its MAZ customer), so it can never
                    disagree with the session. Log in with another account to see the other dashboard. */}
                <Text className="text-sm leading-5 mb-4" style={{ color: colors.textMuted }}>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>
                    Dashboard shows: {userState === "tenant" ? "Tenant" : "New user"}
                  </Text>
                  {" "}— set by the signed-in account (a MAZ customer gets the tenant dashboard).
                </Text>
                <SegmentedControl
                  label="Simulate network errors (15%)"
                  value={simulateErrors ? "on" : "off"}
                  onChange={(next) => setSimulateErrors(next === "on")}
                  options={ON_OFF_OPTIONS}
                />
                <Text className="text-sm leading-5 mb-4" style={{ color: colors.textMuted, marginTop: -8 }}>
                  When on, about 1 in 7 requests to mock features fails at random so error states can be tested.
                  Live data (contracts, bills) is never affected. Turn off before demos.
                </Text>
                <SegmentedControl
                  label="Always start at Welcome"
                  value={startAtWelcome ? "on" : "off"}
                  onChange={(next) => setStartAtWelcome(next === "on")}
                  options={ON_OFF_OPTIONS}
                />
                <Text className="text-sm leading-5 mb-4" style={{ color: colors.textMuted, marginTop: -8 }}>
                  When on, every app launch starts logged out at Welcome, so a demo can show sign-up and log-in. Takes
                  effect next time the app opens.
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
