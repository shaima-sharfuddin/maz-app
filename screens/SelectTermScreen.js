import { useState } from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import SegmentedControl from "../components/SegmentedControl";
import EstimateCard from "../components/EstimateCard";
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

          <EstimateCard
            rows={rows}
            total={formatBHD(estimateTotal(months))}
            note="Sample rate — MAZ confirms final pricing after reviewing your request."
            style={{ marginTop: 4, marginBottom: 32 }}
          />

          <AnimatedButton
            label="Continue to your details"
            onPress={() => navigation.navigate("SubmitRequest", { plan, termMonths: months })}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
