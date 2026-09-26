import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import StyledInput from "../components/StyledInput";
import SelectField from "../components/SelectField";
import FormField from "../components/FormField";
import ErrorBanner from "../components/ErrorBanner";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import RequestSummaryCard from "../components/RequestSummaryCard";
import useZodForm from "../hooks/useZodForm";
import useSubmit from "../hooks/useSubmit";
import { submitRequestSchema } from "../validation/schemas";
import { submitRequest } from "../services/api";
import { ACTIVITIES } from "../data/formOptions";
import { buildRequestSummary, DEFAULT_TERM_MONTHS } from "../data/pricing";
import { useTheme } from "../theme/ThemeContext";

// Plan comes from BrowsePlans and the term from SelectTerm. Location and the monthly rate are still
// PLACEHOLDERS (see data/pricing.js); the fallbacks only apply if this screen is opened directly.
const FALLBACK_PLAN_TITLE = "Office Suite";

export default function SubmitRequestScreen({ navigation, route }) {
  const { colors } = useTheme();
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useZodForm(submitRequestSchema, { fullName: "", email: "", companyName: "", activity: "", remark: "" });
  const { submit, loading, error } = useSubmit(submitRequest);

  const summary = buildRequestSummary(
    route.params?.plan?.title ?? FALLBACK_PLAN_TITLE,
    route.params?.termMonths ?? DEFAULT_TERM_MONTHS
  );

  const onSubmit = handleSubmit(async (values) => {
    const result = await submit({ ...values, summary });
    if (result) {
      // Dashboard underneath so Back leaves the flow; the form can't be re-submitted.
      navigation.reset({
        index: 1,
        routes: [{ name: "HomeDashboard" }, { name: "RequestStatus", params: { requestId: result.requestId, summary } }],
      });
    }
  });

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-10">
            <BackButton onPress={() => navigation.goBack()} />

            <ScreenTitle
              title="Your details"
              subtitle="Submit your office request. We'll email you when its status changes."
            />

            <FormField
              control={control}
              name="fullName"
              component={StyledInput}
              label="Full Name *"
              placeholder="Enter your full name"
              autoComplete="name"
            />
            <FormField
              control={control}
              name="email"
              component={StyledInput}
              label="Email *"
              placeholder="you@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <FormField
              control={control}
              name="companyName"
              component={StyledInput}
              label="Company Name *"
              placeholder="Registered company name"
            />
            <FormField
              control={control}
              name="activity"
              component={SelectField}
              label="Activity *"
              options={ACTIVITIES}
              placeholder="Select business activity"
            />
            <FormField
              control={control}
              name="remark"
              component={StyledInput}
              label="Remark"
              placeholder="Additional requirements or notes (optional)"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 88 }}
            />

            <View className="mt-2 mb-8">
              <RequestSummaryCard summary={summary} />
            </View>

            <AnimatedButton
              label={loading ? "Submitting…" : "Submit Request"}
              onPress={onSubmit}
              disabled={!isValid}
              loading={loading}
            />
            <ErrorBanner message={error} onRetry={onSubmit} />

            <Text className="text-sm leading-5 text-center mt-4" style={{ color: colors.textMuted }}>
              After submission, a confirmation and status updates are sent to the email you provided.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
