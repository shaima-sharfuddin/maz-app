import { useCallback } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import StatusStepper from "../components/StatusStepper";
import RequestSummaryCard from "../components/RequestSummaryCard";
import EmptyState from "../components/EmptyState";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import { fetchRequestStatus } from "../services/api";
import { REQUEST_STEPS } from "../data/requestSteps";
import { useTheme } from "../theme/ThemeContext";

function StatusSkeleton() {
  return (
    <SkeletonCard style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
        {REQUEST_STEPS.map((step) => (
          <Skeleton key={step.key} width={28} height={28} radius={14} />
        ))}
      </View>
      <Skeleton width="80%" height={12} />
    </SkeletonCard>
  );
}

// Placeholder until the backend exists: the mock always reports step 1. Once the API returns
// the request's real stage, only fetchRequestStatus changes — this screen renders any step.
export default function RequestStatusScreen({ navigation, route }) {
  const { colors } = useTheme();
  const requestId = route.params?.requestId;
  const loadStatus = useCallback(() => fetchRequestStatus(requestId), [requestId]);
  const { loading, data, error, reload } = useAsync(loadStatus);

  const summary = data?.summary ?? route.params?.summary;

  const renderStatus = () => {
    if (loading) return <StatusSkeleton />;
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load your request status"
          message="Please check your connection and try again."
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }
    const activeStep = REQUEST_STEPS[data.currentStep - 1];
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
          borderRadius: 16,
          paddingHorizontal: 12,
          paddingVertical: 20,
          marginBottom: 16,
        }}
      >
        <StatusStepper currentStep={data.currentStep} />
        {activeStep ? (
          <Text className="text-sm leading-5 text-center mt-5 px-2" style={{ color: colors.textMuted }}>
            Current stage:{" "}
            <Text style={{ color: colors.text, fontWeight: "600" }}>{activeStep.label}</Text>. Our team will review
            your details, assign a suitable unit, and issue your invoice.
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />

          <ScreenTitle
            eyebrow={requestId ? `Request ${requestId}` : undefined}
            title="Request submitted"
            subtitle="We've received your request. You'll receive updates by email."
          />

          {renderStatus()}

          {summary ? (
            <View className="mb-8">
              <RequestSummaryCard summary={summary} />
            </View>
          ) : null}

          {/* Back (above) retraces the request steps; this jumps straight to the dashboard. */}
          <AnimatedButton label="Back to dashboard" variant="ghost" onPress={() => navigation.popToTop()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
