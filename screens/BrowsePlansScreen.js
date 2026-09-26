import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import TrustStats from "../components/TrustStats";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import PressableScale from "../components/PressableScale";
import EmptyState from "../components/EmptyState";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import { fetchPlans } from "../services/api";
import { TRUST_STATS } from "../data/brand";
import { useTheme } from "../theme/ThemeContext";

function PlanCardSkeleton() {
  return (
    <SkeletonCard style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
        <Skeleton width={44} height={44} radius={12} style={{ marginRight: 14 }} />
        <Skeleton width="50%" height={18} />
      </View>
      <Skeleton width="90%" height={12} style={{ marginBottom: 6 }} />
      <Skeleton width="65%" height={12} style={{ marginBottom: 20 }} />
      <Skeleton height={52} radius={12} />
    </SkeletonCard>
  );
}

function PlanCard({ plan, index, selected, onToggle }) {
  const { colors } = useTheme();

  return (
    <PressableScale
      onPress={onToggle}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      containerStyle={{ marginBottom: 16 }}
      style={{
        backgroundColor: selected ? colors.primaryTint : colors.surface,
        borderWidth: 1.5,
        borderColor: selected ? colors.primary : colors.surfaceBorder,
        borderRadius: 16,
        padding: 20,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
        {/* Simple monogram graphic. */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: colors.primarySoft,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
          }}
        >
          <Text className="text-base font-bold" style={{ color: colors.primary }}>
            {String(index + 1).padStart(2, "0")}
          </Text>
        </View>
        {/* Title and badge stack vertically so long titles wrap instead of being squeezed on small phones. */}
        <View style={{ flex: 1 }}>
          <Text className="text-lg font-semibold" style={{ color: colors.text }}>
            {plan.title}
          </Text>
          {selected ? (
            <Text className="text-xs font-semibold uppercase tracking-widest mt-1" style={{ color: colors.text }}>
              {"✓"} Selected
            </Text>
          ) : null}
        </View>
      </View>

      <Text className="text-sm leading-5 mb-5" style={{ color: colors.textMuted }}>
        {plan.description}
      </Text>

      <AnimatedButton
        label={selected ? "Clear selection" : "Select"}
        variant={selected ? "ghost" : "primary"}
        onPress={onToggle}
      />
    </PressableScale>
  );
}

export default function BrowsePlansScreen({ navigation }) {
  const { colors } = useTheme();
  const { loading, data: plans, error, reload } = useAsync(fetchPlans);
  const [selectedId, setSelectedId] = useState(null);

  const toggleSelect = (plan) => {
    setSelectedId((prev) => (prev === plan.id ? null : plan.id));
  };

  const selectedPlan = plans?.find((plan) => plan.id === selectedId);

  const renderPlans = () => {
    if (loading) {
      return [0, 1, 2].map((key) => <PlanCardSkeleton key={key} />);
    }
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load plans"
          message="Please check your connection and try again."
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }
    if (plans.length === 0) {
      return (
        <EmptyState
          icon="briefcase-outline"
          title="No plans available right now"
          message="Our team is preparing new offerings. Please check back shortly."
        />
      );
    }
    return plans.map((plan, index) => (
      <PlanCard
        key={plan.id}
        plan={plan}
        index={index}
        selected={plan.id === selectedId}
        onToggle={() => toggleSelect(plan)}
      />
    ));
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />

          <ScreenTitle
            eyebrow="MAZ Business Center"
            title="Browse plans"
            subtitle="Prestigious workspaces and seamless business services, tailored to how you work."
          />

          <View className="mb-8">
            <TrustStats stats={TRUST_STATS} />
          </View>

          {renderPlans()}
        </View>
      </ScrollView>

      {/* Fixed footer once a plan is chosen, so Continue is always reachable without scrolling. */}
      {selectedPlan ? (
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 8,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.surfaceBorder,
          }}
        >
          <AnimatedButton
            label={`Continue with ${selectedPlan.title}`}
            onPress={() => navigation.navigate("SelectTerm", { plan: selectedPlan })}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
