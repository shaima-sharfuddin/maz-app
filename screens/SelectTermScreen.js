import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import SegmentedControl from "../components/SegmentedControl";
import {
  TERM_OPTIONS,
  DEFAULT_TERM_MONTHS,
  PLACEHOLDER_MONTHLY_RATE_BHD,
  formatTerm,
  formatBHD,
  estimateTotal,
} from "../data/pricing";
import { useTheme } from "../theme/ThemeContext";

const TERM_SEGMENTS = TERM_OPTIONS.map((months) => ({ value: months, label: formatTerm(months) }));

// Duration step between BrowsePlans and SubmitRequest (per the recruiter wireframe).
export default function SelectTermScreen({ navigation, route }) {
  const { colors } = useTheme();
  const plan = route.params?.plan;
  const [months, setMonths] = useState(DEFAULT_TERM_MONTHS);

  const rows = [
    { label: "Selected duration", value: formatTerm(months) },
    { label: "Monthly rate", value: `${formatBHD(PLACEHOLDER_MONTHLY_RATE_BHD)}/month` },
  ];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />

          <ScreenTitle
            eyebrow={plan?.title}
            title="Select your duration"
            subtitle="Choose the number of months you need. The amount shown is an estimate for your request."
          />

          <SegmentedControl label="Duration" value={months} onChange={setMonths} options={TERM_SEGMENTS} />

          <View
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.surfaceBorder,
              borderRadius: 16,
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: 8,
              marginTop: 4,
              marginBottom: 32,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 6 }}>
              Estimated amount
            </Text>
            {rows.map((row) => (
              <View
                key={row.label}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.surfaceBorder,
                }}
              >
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>{row.label}</Text>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500" }}>{row.value}</Text>
              </View>
            ))}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingVertical: 14 }}>
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>Estimated total</Text>
              {/* Same text box every render, so switching durations never shifts the layout. */}
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>
                {formatBHD(estimateTotal(months))}
              </Text>
            </View>
            <Text style={{ color: colors.textSubtle, fontSize: 12, lineHeight: 16, paddingBottom: 6 }}>
              Sample rate — MAZ confirms final pricing after reviewing your request.
            </Text>
          </View>

          <AnimatedButton
            label="Continue to your details"
            onPress={() => navigation.navigate("SubmitRequest", { plan, termMonths: months })}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
