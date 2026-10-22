import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import CategoryChips from "../components/CategoryChips";
import PlanCard, { PlanCardSkeleton } from "../components/PlanCard";
import EmptyState from "../components/EmptyState";
import useAsync from "../hooks/useAsync";
import { fetchPlans, errorMessage } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { TYPE } from "../theme/theme";
import FadeIn from "../components/FadeIn";
import { openPlan } from "../utils/openPlan";

const ALL = "all";

// Explore (Visual system v2, Airbnb-inspired): the services a customer can request (fetchPlans: Office Suites, CR
// Registration) as photo listing cards under a category row. A card opens its listing page (PlanDetail) via
// utils/openPlan.js. Switching category re-plays the cards' staggered entrance.
export default function BrowsePlansScreen({ navigation }) {
  const { colors } = useTheme();
  const { loading, data: plans, error, reload } = useAsync(fetchPlans);
  const [category, setCategory] = useState(ALL);

  const categories = [
    { value: ALL, label: "All", icon: "grid-outline" },
    ...(plans ?? []).map((plan) => ({ value: plan.id, label: plan.title, icon: plan.icon ?? "business-outline" })),
  ];
  const shown = (plans ?? []).filter((plan) => category === ALL || plan.id === category);

  const renderPlans = () => {
    if (loading) return [0, 1].map((key) => <PlanCardSkeleton key={key} />);
    if (error) {
      return (
        <EmptyState icon="cloud-offline-outline" title="We couldn't load our services" message={errorMessage(error)}>
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }
    if (shown.length === 0) {
      return (
        <EmptyState
          icon="briefcase-outline"
          title="No services available right now"
          message="Our team is preparing new offerings. Please check back shortly."
        />
      );
    }
    // key={category}: a new category remounts the list, so its cards settle in again.
    return (
      <View key={category}>
        {shown.map((plan, index) => (
          <FadeIn key={plan.id} index={index}>
            <PlanCard plan={plan} onPress={() => openPlan(navigation, plan)} />
          </FadeIn>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1" style={{ backgroundColor: colors.canvas }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        <BackButton onPress={() => navigation.goBack()} />
        <FadeIn>
          <Text accessibilityRole="header" style={[TYPE.largeTitle, { color: colors.text, marginTop: 4 }]}>
            Explore
          </Text>
          <Text style={[TYPE.body, { color: colors.textMuted, marginTop: 4, marginBottom: 16 }]}>
            Prestigious workspaces and seamless business services.
          </Text>
        </FadeIn>
      </View>

      {plans?.length ? <CategoryChips items={categories} value={category} onChange={setCategory} /> : null}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}>
        {renderPlans()}
      </ScrollView>
    </SafeAreaView>
  );
}
