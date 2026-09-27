import { useCallback } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useWatch } from "react-hook-form";
import AnimatedButton from "../components/AnimatedButton";
import StyledInput from "../components/StyledInput";
import SegmentedControl from "../components/SegmentedControl";
import FormField from "../components/FormField";
import ErrorBanner from "../components/ErrorBanner";
import EmptyState from "../components/EmptyState";
import EstimateCard from "../components/EstimateCard";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useZodForm from "../hooks/useZodForm";
import useSubmit from "../hooks/useSubmit";
import useAsync from "../hooks/useAsync";
import { renewalSchema } from "../validation/schemas";
import { fetchContract, requestRenewal } from "../services/api";
import { TERM_OPTIONS, DEFAULT_TERM_MONTHS, formatTerm, formatBHD, estimateTotal, extendEndDate } from "../data/pricing";
import { formatDate } from "../utils/formatDate";
import { useTheme } from "../theme/ThemeContext";

const TERM_SEGMENTS = TERM_OPTIONS.map((months) => ({ value: months, label: formatTerm(months) }));

// Renewal is a request: MAZ's admin reviews it, as with a new office request. Opened from ContractDetail.
export default function RenewContractScreen({ navigation, route }) {
  const { colors } = useTheme();
  const contractId = route.params?.contractId;
  const loadContract = useCallback(() => fetchContract(contractId), [contractId]);
  const { loading: contractLoading, data: contract, error: contractError, reload } = useAsync(loadContract);

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useZodForm(renewalSchema, { termMonths: DEFAULT_TERM_MONTHS, remark: "" });
  const termMonths = useWatch({ control, name: "termMonths" });
  const submitRenewal = useCallback((values) => requestRenewal(contractId, values), [contractId]);
  const { submit, loading, error, errorCode } = useSubmit(submitRenewal);

  const onSubmit = handleSubmit(async (values) => {
    const result = await submit(values);
    if (result) {
      navigation.reset({
        index: 1,
        routes: [{ name: "HomeDashboard" }, { name: "ContractDetail", params: { contractId, renewalRequested: true } }],
      });
    }
  });

  const renderContent = () => {
    if (contractLoading) {
      return (
        <View>
          <Skeleton height={48} radius={12} style={{ marginBottom: 20 }} />
          <SkeletonCard>
            <Skeleton width="40%" height={16} style={{ marginBottom: 14 }} />
            <Skeleton width="90%" height={12} style={{ marginBottom: 8 }} />
            <Skeleton width="70%" height={12} style={{ marginBottom: 8 }} />
            <Skeleton width="50%" height={22} />
          </SkeletonCard>
        </View>
      );
    }
    if (contractError) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load this contract"
          message="Please check your connection and try again."
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }
    if (contract.status !== "active" || contract.renewal) {
      return (
        <EmptyState
          icon={contract.renewal ? "time-outline" : "document-text-outline"}
          title={contract.renewal ? "Renewal already requested" : "This contract can't be renewed"}
          message={
            contract.renewal
              ? "Your renewal request is under review. We'll confirm the new terms by email."
              : "Only active contracts can be renewed. Find a new office to start a fresh contract."
          }
        >
          <AnimatedButton label="Back to contract" onPress={() => navigation.goBack()} />
        </EmptyState>
      );
    }

    const newEndDate = extendEndDate(contract.endDate, termMonths);
    return (
      <View>
        <FormField
          control={control}
          name="termMonths"
          component={SegmentedControl}
          label="Renewal term"
          options={TERM_SEGMENTS}
        />

        <EstimateCard
          rows={[
            { label: "Current end date", value: formatDate(contract.endDate) },
            { label: "New end date", value: formatDate(newEndDate) },
            { label: "Monthly rate", value: `${formatBHD(contract.monthlyRate)}/month` },
          ]}
          total={formatBHD(estimateTotal(termMonths, contract.monthlyRate))}
          note="Estimate at your current rate — MAZ confirms the final terms when approving your renewal."
          style={{ marginTop: 4, marginBottom: 24 }}
        />

        <FormField
          control={control}
          name="remark"
          component={StyledInput}
          label="Remark"
          placeholder="Anything we should know about your renewal (optional)"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={{ minHeight: 88 }}
        />

        <AnimatedButton
          label={loading ? "Submitting…" : "Request renewal"}
          onPress={onSubmit}
          disabled={!isValid}
          loading={loading}
        />
        {/* A request already under review can't be retried — only network-type failures offer "Try again". */}
        <ErrorBanner
          message={error}
          onRetry={errorCode === "RENEWAL_PENDING" || errorCode === "NOT_ACTIVE" ? undefined : onSubmit}
        />

        <Text className="text-sm leading-5 text-center mt-4" style={{ color: colors.textMuted }}>
          Your current contract continues unchanged while we review your request.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-10">
            <BackButton onPress={() => navigation.goBack()} />
            <ScreenTitle
              eyebrow={contract ? `${contract.id} · ${contract.unit}` : "Contract"}
              title="Renew your contract"
              subtitle="Choose how long to extend. We'll review your request and confirm by email."
            />
            {renderContent()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
