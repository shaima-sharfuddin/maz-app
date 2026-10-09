import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import DetailCard from "../components/DetailCard";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import RequestSummaryCard from "../components/RequestSummaryCard";
import ScreenTitle from "../components/ScreenTitle";
import useSubmit from "../hooks/useSubmit";
import { submitRequest } from "../services/api";
import { buildRequestSummary } from "../data/pricing";
import { useTheme } from "../theme/ThemeContext";
import { useAuth } from "../auth/AuthContext";

// SelectTerm → here → RequestStatus: the last look before the request is sent. Submits with the
// signed-in user's name, email and company (collected at sign-up — no details form, client feedback
// 2026-10-07), plus a New User's sign-up Activity (null for tenants). "Edit" goes back to SelectTerm.
export default function ReviewRequestScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { plan, termMonths, paymentFrequency } = route.params ?? {};
  const { submit, loading, error } = useSubmit(submitRequest);
  // Set once the request is sent. This screen stays in the stack (Back retraces every step), but the
  // request can't be sent twice — the button opens its status instead.
  const [submitted, setSubmitted] = useState(null); // { requestId, summary }

  if (!plan || !termMonths || !paymentFrequency) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />
          <EmptyState
            icon="document-text-outline"
            title="Your request is incomplete"
            message="Choose a lease length and payment frequency first."
          >
            <AnimatedButton label="Go back" onPress={() => navigation.goBack()} />
          </EmptyState>
        </View>
      </SafeAreaView>
    );
  }

  const summary = buildRequestSummary(plan.title, termMonths, paymentFrequency);
  const customerRows = [
    user?.name ? { label: "Customer", value: user.name } : null,
    user?.companyName ? { label: "Company", value: user.companyName } : null,
    user?.activity ? { label: "Activity", value: user.activity } : null,
    user?.email ? { label: "Email", value: user.email } : null,
  ].filter(Boolean);

  const openStatus = (sent) => navigation.navigate("RequestStatus", sent);

  const onSubmit = async () => {
    const result = await submit({
      fullName: user?.name ?? "",
      email: user?.email ?? "",
      companyName: user?.companyName ?? "",
      activity: user?.activity ?? null, // New User's sign-up Activity (mock request only); null for tenants
      remark: "",
      termMonths,
      paymentFrequency,
      summary,
    });
    if (!result) return; // shown by the ErrorBanner below
    const sent = { requestId: result.requestId, summary };
    setSubmitted(sent);
    openStatus(sent);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />

          <ScreenTitle
            eyebrow={plan.title}
            title="Review your request"
            subtitle="Check the details below. MAZ reviews every request and confirms your unit and final pricing."
          />

          <RequestSummaryCard summary={summary} title="Your request" />

          {customerRows.length > 0 ? (
            <DetailCard title="Requesting as" rows={customerRows} style={{ marginTop: 16, marginBottom: 32 }} />
          ) : (
            <View className="mb-8" />
          )}

          {submitted ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} style={{ marginRight: 6 }} />
                <Text className="text-sm" style={{ color: colors.success }}>
                  Request submitted
                </Text>
              </View>
              <AnimatedButton label="View request status" onPress={() => openStatus(submitted)} />
            </>
          ) : (
            <>
              <AnimatedButton
                label={loading ? "Submitting your request…" : "Submit request"}
                onPress={onSubmit}
                loading={loading}
              />
              <ErrorBanner message={error} onRetry={onSubmit} />
              <View style={{ marginTop: 8 }}>
                <AnimatedButton label="Edit" variant="ghost" onPress={() => navigation.goBack()} disabled={loading} />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
