import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import SegmentedControl from "../components/SegmentedControl";
import { useTheme } from "../theme/ThemeContext";

const APPEARANCE_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function SettingsScreen({ navigation }) {
  const { colors, preference, setPreference, scheme } = useTheme();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />

          <ScreenTitle title="Settings" subtitle="Tailor your MAZ experience." />

          <Text className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: colors.accent }}>
            Appearance
          </Text>
          <View
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.surfaceBorder,
              borderRadius: 16,
              padding: 16,
              paddingBottom: 0,
            }}
          >
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
