import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import StyledInput from "../components/StyledInput";
import SelectField from "../components/SelectField";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import RequestSummaryCard from "../components/RequestSummaryCard";
import { submitRequest } from "../api/mockApi";
import { ACTIVITIES } from "../data/formOptions";
import { buildRequestSummary, DEFAULT_TERM_MONTHS } from "../data/pricing";
import { useTheme } from "../theme/ThemeContext";

// Plan comes from BrowsePlans and the term from SelectTerm. Location and the monthly rate are still
// PLACEHOLDERS (see data/pricing.js); the fallbacks only apply if this screen is opened directly.
const FALLBACK_PLAN_TITLE = "Office Suite";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SubmitRequestScreen({ navigation, route }) {
  const { colors } = useTheme();
  const [form, setForm] = useState({ fullName: "", email: "", companyName: "", activity: "", remark: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const summary = buildRequestSummary(
    route.params?.plan?.title ?? FALLBACK_PLAN_TITLE,
    route.params?.termMonths ?? DEFAULT_TERM_MONTHS
  );

  const handleSubmit = async () => {
    if (submitting) return;

    const missing = [];
    if (!form.fullName.trim()) missing.push("Full Name");
    if (!form.email.trim()) missing.push("Email");
    if (!form.companyName.trim()) missing.push("Company Name");
    if (!form.activity) missing.push("Activity");
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(", ")}`);
      return;
    }
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const { requestId } = await submitRequest({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        companyName: form.companyName.trim(),
        activity: form.activity,
        remark: form.remark.trim(),
        summary,
      });
      // Dashboard underneath so Back leaves the flow; the form can't be re-submitted.
      navigation.reset({
        index: 1,
        routes: [{ name: "HomeDashboard" }, { name: "RequestStatus", params: { requestId, summary } }],
      });
    } catch {
      setError("We couldn't submit your request. Please try again.");
      setSubmitting(false);
    }
  };

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

            <StyledInput
              label="Full Name *"
              value={form.fullName}
              onChangeText={update("fullName")}
              placeholder="Enter your full name"
              autoComplete="name"
            />
            <StyledInput
              label="Email *"
              value={form.email}
              onChangeText={update("email")}
              placeholder="you@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <StyledInput
              label="Company Name *"
              value={form.companyName}
              onChangeText={update("companyName")}
              placeholder="Registered company name"
            />
            <SelectField
              label="Activity *"
              value={form.activity}
              onChange={update("activity")}
              options={ACTIVITIES}
              placeholder="Select business activity"
            />
            <StyledInput
              label="Remark"
              value={form.remark}
              onChangeText={update("remark")}
              placeholder="Additional requirements or notes (optional)"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 88 }}
            />

            <View className="mt-2 mb-8">
              <RequestSummaryCard summary={summary} />
            </View>

            <AnimatedButton label={submitting ? "Submitting…" : "Submit Request"} onPress={handleSubmit} />
            {error ? (
              <Text className="text-sm text-center mt-3" style={{ color: colors.danger }}>
                {error}
              </Text>
            ) : null}

            <Text className="text-sm leading-5 text-center mt-4" style={{ color: colors.textMuted }}>
              After submission, a confirmation and status updates are sent to the email you provided.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
