import { useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import SegmentedControl from "../components/SegmentedControl";
import AnimatedButton from "../components/AnimatedButton";
import { useTheme } from "../theme/ThemeContext";
import { useDemo } from "../demo/DemoContext";
import { useAuth } from "../auth/AuthContext";

const APPEARANCE_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const DEMO_OPTIONS = [
  { value: "tenant", label: "Tenant" },
  { value: "newUser", label: "New user" },
];

const ERROR_SIM_OPTIONS = [
  { value: "on", label: "On" },
  { value: "off", label: "Off" },
];

export default function SettingsScreen({ navigation }) {
  const { colors, preference, setPreference, scheme } = useTheme();
  const { userState, setUserState, simulateErrors, setSimulateErrors } = useDemo();
  const { user, signOut } = useAuth();
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

  const sectionHeading = (label) => (
    <Text className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: colors.accent }}>
      {label}
    </Text>
  );

  const cardStyle = {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 16,
    padding: 16,
    paddingBottom: 0,
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />

          <ScreenTitle title="Settings" subtitle="Tailor your MAZ experience." />

          {user ? (
            <>
              {sectionHeading("Account")}
              <View style={[cardStyle, { paddingBottom: 16, marginBottom: 32 }]}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Logged in as</Text>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginTop: 2 }}>
                  {user.name || user.email}
                </Text>
                {user.name ? <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{user.email}</Text> : null}
                <View style={{ marginTop: 12 }}>
                  <AnimatedButton
                    label={loggingOut ? "Logging out…" : "Log out"}
                    variant="ghost"
                    loading={loggingOut}
                    onPress={confirmLogOut}
                  />
                </View>
              </View>
            </>
          ) : null}

          {sectionHeading("Appearance")}
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

          {/* DEMO ONLY — remove this section once real account data comes from the backend. */}
          {sectionHeading("Demo data")}
          <View style={cardStyle}>
            <SegmentedControl
              label="Dashboard shows"
              value={userState}
              onChange={setUserState}
              options={DEMO_OPTIONS}
            />
            <Text className="text-sm leading-5 mb-4" style={{ color: colors.textMuted, marginTop: -8 }}>
              Demo only — switches the mock data used while there&apos;s no backend.
            </Text>
            <SegmentedControl
              label="Simulate network errors (15%)"
              value={simulateErrors ? "on" : "off"}
              onChange={(next) => setSimulateErrors(next === "on")}
              options={ERROR_SIM_OPTIONS}
            />
            <Text className="text-sm leading-5 mb-4" style={{ color: colors.textMuted, marginTop: -8 }}>
              When on, about 1 in 7 requests fails at random so error states can be tested. Turn off before
              demos.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
