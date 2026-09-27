import { useCallback, useEffect, useMemo } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import StyledInput from "../components/StyledInput";
import SelectField from "../components/SelectField";
import FormField from "../components/FormField";
import ErrorBanner from "../components/ErrorBanner";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import useZodForm from "../hooks/useZodForm";
import useSubmit from "../hooks/useSubmit";
import useAsync from "../hooks/useAsync";
import { supportEnquirySchema } from "../validation/schemas";
import { fetchDashboard, submitEnquiry } from "../services/api";
import { SUPPORT_CATEGORIES } from "../data/formOptions";
import { useTheme } from "../theme/ThemeContext";
import { useDemo } from "../demo/DemoContext";

const NO_CONTRACT = "Not about a specific contract";
const contractLabel = (contract) => `${contract.id} · ${contract.unit}`;

// route.params.prefill ({ category, contractId, subject }) pre-fills the form, e.g. from a violation.
export default function NewEnquiryScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { userState } = useDemo();
  const prefill = route.params?.prefill;

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { isValid },
  } = useZodForm(supportEnquirySchema, {
    category: prefill?.category ?? "",
    contract: "",
    subject: prefill?.subject ?? "",
    message: "",
  });
  const { submit, loading, error } = useSubmit(submitEnquiry);

  // The optional Contract field lists the tenant's contracts; it's simply left out if they can't load.
  const loadContracts = useCallback(() => fetchDashboard(userState), [userState]);
  const { data: dashboard } = useAsync(loadContracts);
  const contracts = useMemo(() => dashboard?.contracts ?? [], [dashboard]);
  const contractOptions = useMemo(() => [NO_CONTRACT, ...contracts.map(contractLabel)], [contracts]);

  useEffect(() => {
    const match = contracts.find((c) => c.id === prefill?.contractId);
    if (match && !getValues("contract")) setValue("contract", contractLabel(match));
  }, [contracts, prefill?.contractId, getValues, setValue]);

  const onSubmit = handleSubmit(async ({ category, contract, subject, message }) => {
    const selected = contracts.find((c) => contractLabel(c) === contract);
    const contractId = selected?.id ?? (contract ? null : prefill?.contractId ?? null);
    const result = await submit({ category, contractId, subject, message });
    if (result) {
      navigation.reset({
        index: 1,
        routes: [{ name: "HomeDashboard" }, { name: "Support", params: { submitted: true } }],
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
              title="New enquiry"
              subtitle="Tell us how we can help. Our client services team will reply by email and in the app."
            />

            <FormField
              control={control}
              name="category"
              component={SelectField}
              label="Category *"
              options={SUPPORT_CATEGORIES}
              placeholder="Select a category"
            />
            {contracts.length > 0 ? (
              <FormField
                control={control}
                name="contract"
                component={SelectField}
                label="Contract"
                options={contractOptions}
                placeholder="Select a contract (optional)"
              />
            ) : null}
            <FormField
              control={control}
              name="subject"
              component={StyledInput}
              label="Subject *"
              placeholder="A short summary"
              maxLength={120}
            />
            <FormField
              control={control}
              name="message"
              component={StyledInput}
              label="Message *"
              placeholder="Describe your enquiry in as much detail as you like"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={{ minHeight: 120 }}
            />

            <View className="mt-2">
              <AnimatedButton
                label={loading ? "Sending…" : "Send enquiry"}
                onPress={onSubmit}
                disabled={!isValid}
                loading={loading}
              />
            </View>
            <ErrorBanner message={error} onRetry={onSubmit} />

            <Text className="text-sm leading-5 text-center mt-4" style={{ color: colors.textMuted }}>
              You can follow your enquiry under Support at any time.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
