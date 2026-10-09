import { useCallback, useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useWatch } from "react-hook-form";
import { usePreventRemove } from "@react-navigation/native";
import AnimatedButton from "../components/AnimatedButton";
import StyledInput from "../components/StyledInput";
import SegmentedControl from "../components/SegmentedControl";
import FormField from "../components/FormField";
import ErrorBanner from "../components/ErrorBanner";
import EmptyState from "../components/EmptyState";
import DetailCard from "../components/DetailCard";
import BackButton from "../components/BackButton";
import PhotoHero from "../components/PhotoHero";
import AmountHero from "../components/AmountHero";
import { Ionicons } from "@expo/vector-icons";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useZodForm from "../hooks/useZodForm";
import useSubmit from "../hooks/useSubmit";
import useAsync from "../hooks/useAsync";
import { renewalSchema } from "../validation/schemas";
import {
  fetchContract,
  fetchRenewal,
  renewalEligibility,
  requestRenewal,
  RENEWAL_TERM_OPTIONS,
  RENEWALS_ARE_DEMO,
  getExpiryWarningDays,
  errorMessage,
} from "../services/api";
import { DEFAULT_RENEWAL_TERM_MONTHS, formatTerm, formatBHD, estimateTotal, extendEndDate } from "../data/pricing";
import { formatDate } from "../utils/formatDate";
import { unitWithLocation } from "../utils/formatUnit";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";
import { TYPE } from "../theme/theme";
import FadeIn from "../components/FadeIn";
import IconBadge from "../components/IconBadge";
import InfoNote from "../components/InfoNote";

const TERM_SEGMENTS = RENEWAL_TERM_OPTIONS.map((months) => ({ value: months, label: formatTerm(months) }));

// Contract Details → here: Select term → Review → Submit → Renewal Status. Always a REQUEST for MAZ to review —
// never an automatic renewal, and the real MAZ contract isn't changed. The contract (end date, monthly rent) is REAL
// (contractService); the request goes to renewalService, which is MOCK while RENEWALS_ARE_DEMO (kept in the app,
// not sent to MAZ). This screen stays on the stack after submitting (Back retraces), showing "View renewal status".
export default function RenewContractScreen({ navigation, route }) {
  const { colors } = useTheme();
  const card = useCardStyle();
  const contractId = route.params?.contractId;
  const loadData = useCallback(
    () => Promise.all([fetchContract(contractId), fetchRenewal(contractId)]),
    [contractId]
  );
  const { loading: dataLoading, data, error: dataError, reload } = useAsync(loadData);
  const [contract, existingRenewal] = data ?? [];

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useZodForm(renewalSchema, { termMonths: DEFAULT_RENEWAL_TERM_MONTHS, remark: "" });
  const [termMonths, remark] = useWatch({ control, name: ["termMonths", "remark"] });
  const [step, setStep] = useState("term"); // "term" → "review"
  const [submitted, setSubmitted] = useState(null); // the renewal, once sent
  const submitRenewal = useCallback((values) => requestRenewal(contractId, values), [contractId]);
  const { submit, loading, error, errorCode } = useSubmit(submitRenewal);

  const openStatus = () => navigation.navigate("RenewalStatus", { contractId });
  // Back (button, Android back, iOS swipe) from the review step returns to the term step first.
  const reviewing = step === "review" && !submitted;
  usePreventRemove(reviewing && !loading, () => setStep("term"));

  const onSubmit = handleSubmit(async (values) => {
    const result = await submit(values);
    if (!result) return; // shown by the ErrorBanner
    setSubmitted(result);
    openStatus();
  });

  const renderContent = () => {
    if (dataLoading) {
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
    if (dataError) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load this contract"
          message={errorMessage(dataError)}
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }

    if (submitted) {
      return (
        <View>
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <IconBadge icon="checkmark" size={56} tone="success" animate style={{ marginBottom: 14 }} />
            <FadeIn delay={160}>
              <Text style={[TYPE.value, { color: colors.success, textAlign: "center" }]}>
                Renewal request submitted{RENEWALS_ARE_DEMO ? " (demo)" : ""}
              </Text>
            </FadeIn>
          </View>
          <AnimatedButton label="View renewal status" onPress={openStatus} />
        </View>
      );
    }

    const { canRequest, reason, opensOn } = renewalEligibility(contract, existingRenewal);
    if (!canRequest) {
      const alreadyRequested = reason === "already-requested";
      const blocked = {
        "already-requested": ["Renewal already requested", "Your renewal request is with MAZ. You can follow it on the renewal status page."],
        "outside-window": [
          "Renewal isn't open yet",
          `Renewal requests open ${getExpiryWarningDays()} days before the end date (${formatDate(contract.endDate)}) — from ${opensOn ? formatDate(opensOn) : "later"}.`,
        ],
        expired: ["This contract has ended", "Its end date has passed. Find a new office to start a fresh contract."],
        "no-end-date": ["This contract can't be renewed", "It has no end date to renew from. Please contact MAZ."],
        "not-active": ["This contract can't be renewed", "Only active contracts can be renewed. Find a new office to start a fresh contract."],
      }[reason];
      return (
        <EmptyState
          icon={alreadyRequested || reason === "outside-window" ? "time-outline" : "document-text-outline"}
          title={blocked[0]}
          message={blocked[1]}
        >
          <AnimatedButton
            label={alreadyRequested ? "View renewal status" : "Back to contract"}
            onPress={alreadyRequested ? openStatus : () => navigation.goBack()}
          />
        </EmptyState>
      );
    }

    const newEndDate = extendEndDate(contract.endDate, termMonths);
    const estimate = contract.monthlyRate != null ? estimateTotal(termMonths, contract.monthlyRate) : null;
    const demoNote = RENEWALS_ARE_DEMO ? (
      <InfoNote boxed style={{ marginTop: 20 }}>
        Demo renewal — your request is kept in the app for this session and is not sent to MAZ. Your contract stays
        unchanged.
      </InfoNote>
    ) : null;

    if (step === "review") {
      return (
        <FadeIn key="review">
          <DetailCard
            title="Your renewal request"
            rows={[
              { label: "Contract", value: contract.id },
              { label: "Unit", value: unitWithLocation(contract.unit, contract.location) },
              { label: "Current end date", value: formatDate(contract.endDate) },
              { label: "Renewal term", value: formatTerm(termMonths) },
              { label: "Proposed end date", value: formatDate(newEndDate), emphasize: true },
              ...(estimate != null ? [{ label: "Estimate at current rent", value: formatBHD(estimate) }] : []),
              ...(remark?.trim() ? [{ label: "Remark", value: remark.trim() }] : []),
            ]}
            style={{ marginBottom: 32 }}
          />
          <AnimatedButton
            label={loading ? "Submitting…" : RENEWALS_ARE_DEMO ? "Submit renewal request (demo)" : "Submit renewal request"}
            onPress={onSubmit}
            disabled={!isValid}
            loading={loading}
          />
          {/* A request already in progress can't be retried — only network-type failures offer "Try again". */}
          <ErrorBanner
            message={error}
            onRetry={
              ["RENEWAL_PENDING", "NOT_ACTIVE", "RENEWAL_NOT_OPEN", "NO_END_DATE"].includes(errorCode) ? undefined : onSubmit
            }
          />
          <View style={{ marginTop: 8 }}>
            <AnimatedButton label="Edit" variant="ghost" onPress={() => setStep("term")} disabled={loading} />
          </View>
          {demoNote}
        </FadeIn>
      );
    }

    return (
      <FadeIn key="term">
        <FormField
          control={control}
          name="termMonths"
          component={SegmentedControl}
          label="Renewal term"
          options={TERM_SEGMENTS}
        />

        {/* The estimate as a timeline: current end date → proposed end date, then the rent and the total. */}
        <View style={[card, { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16, marginTop: 4, marginBottom: 24 }]}>
          <Text style={[TYPE.cardTitle, { color: colors.text, marginBottom: 16 }]}>Estimated amount</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={[TYPE.caption, { color: colors.textMuted, marginBottom: 4 }]}>Current end date</Text>
              <Text style={[TYPE.value, { color: colors.textSecondary }]}>{formatDate(contract.endDate)}</Text>
            </View>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.primarySoft,
                alignItems: "center",
                justifyContent: "center",
                marginHorizontal: 10,
              }}
            >
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={[TYPE.caption, { color: colors.textMuted, marginBottom: 4 }]}>Proposed end date</Text>
              <Text style={[TYPE.value, { color: colors.text, fontWeight: "700" }]}>{formatDate(newEndDate)}</Text>
            </View>
          </View>
          {contract.monthlyRate != null ? (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 12,
                borderTopWidth: 1,
                borderTopColor: colors.divider,
              }}
            >
              <Text style={[TYPE.label, { color: colors.textMuted }]}>Monthly rent</Text>
              <Text style={[TYPE.label, { color: colors.text, fontWeight: "500", fontVariant: ["tabular-nums"] }]}>
                {`${formatBHD(contract.monthlyRate)}/month`}
              </Text>
            </View>
          ) : null}
          <View style={{ paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.divider }}>
            <AmountHero label="Estimated total" amount={estimate != null ? formatBHD(estimate) : "—"} />
          </View>
          <Text style={[TYPE.caption, { color: colors.textSubtle, marginTop: 10 }]}>
            Estimate at your current monthly rent — MAZ confirms the final terms when reviewing your request.
          </Text>
        </View>

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

        <View className="mt-4">
          <AnimatedButton label="Review request" onPress={() => setStep("review")} disabled={!isValid} />
        </View>
        {demoNote}
      </FadeIn>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <PhotoHero
            photo="renewal"
            overlay="navy"
            minHeight={300}
            contentStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 26, justifyContent: "space-between" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <BackButton onHero onPress={() => (reviewing ? setStep("term") : navigation.goBack())} />
              {/* Presentation copy (visual phase 3). */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: colors.heroGlass,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  marginLeft: 8,
                  flexShrink: 1,
                }}
              >
                <Ionicons name="refresh-outline" size={13} color={colors.onHero} />
                <Text numberOfLines={1} style={{ color: colors.onHero, fontSize: 12, fontWeight: "600", flexShrink: 1 }}>
                  Keep your workspace going
                </Text>
              </View>
            </View>
            <FadeIn key={reviewing ? "review" : "term"} style={{ paddingTop: 56 }}>
              <Text style={[TYPE.overline, { color: colors.onHeroMuted, marginBottom: 10 }]}>
                {contract ? `Contract ${contract.id}` : "Contract"}
              </Text>
              <Text accessibilityRole="header" style={[TYPE.screenTitle, { color: colors.onHero, marginBottom: 8 }]}>
                {reviewing ? "Review your renewal" : "Renew your contract"}
              </Text>
              <Text style={{ color: colors.onHeroMuted, fontSize: 15, lineHeight: 22 }}>
                Renewal is a request — MAZ reviews it and confirms the new terms.
              </Text>
            </FadeIn>
          </PhotoHero>
          <View className="flex-1 px-6 pt-8 pb-10">{renderContent()}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
