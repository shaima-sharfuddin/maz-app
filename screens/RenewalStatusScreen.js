import { useCallback } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import DetailCard from "../components/DetailCard";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import PhotoHero from "../components/PhotoHero";
import StatusBadge from "../components/StatusBadge";
import StatusStepper from "../components/StatusStepper";
import StaleDataNote from "../components/StaleDataNote";
import TextLink from "../components/TextLink";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import useSubmit from "../hooks/useSubmit";
import { fetchContract, fetchRenewal, advanceRenewalDemo, RENEWAL_STEPS, RENEWALS_ARE_DEMO, errorMessage } from "../services/api";
import { formatTerm } from "../data/pricing";
import { formatDate } from "../utils/formatDate";
import { unitWithLocation } from "../utils/formatUnit";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";
import { TYPE } from "../theme/theme";
import FadeIn from "../components/FadeIn";
import InfoNote from "../components/InfoNote";

const HEADINGS = {
  requested: { title: "Renewal requested", subtitle: "MAZ will review your request and confirm the new terms." },
  reviewing: { title: "Renewal under review", subtitle: "MAZ is reviewing your renewal request." },
  approved: { title: "Renewal approved", subtitle: "MAZ would now issue your renewed contract." },
};

// Contract Details / Renew Contract / a renewal notification → here. The request's stage (renewalService — MOCK while
// RENEWALS_ARE_DEMO) over the REAL contract (contractService). The contract itself is never changed here.
export default function RenewalStatusScreen({ navigation, route }) {
  const { colors } = useTheme();
  const card = useCardStyle();
  const contractId = route.params?.contractId;
  const loadData = useCallback(
    () => Promise.all([fetchContract(contractId), fetchRenewal(contractId)]),
    [contractId]
  );
  // keepData: after the demo control moves the stage on, the old status stays up while it reloads.
  const { loading, data, error, stale, reload } = useAsync(loadData, { keepData: true, keepDataOnError: true });
  const [contract, renewal] = data ?? [];
  const advance = useSubmit(advanceRenewalDemo);

  const onAdvance = async () => {
    if (await advance.submit(contractId)) reload();
  };

  const renderContent = () => {
    if (loading && !data) {
      return (
        <SkeletonCard>
          <Skeleton width="90%" height={28} style={{ marginBottom: 16 }} />
          <Skeleton width="70%" height={12} style={{ marginBottom: 8 }} />
          <Skeleton width="50%" height={12} />
        </SkeletonCard>
      );
    }
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load your renewal"
          message={errorMessage(error)}
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }
    if (!renewal) {
      return (
        <EmptyState
          icon="refresh-outline"
          title="No renewal request"
          message="There's no renewal request for this contract in this session."
        >
          <AnimatedButton label="Back to contract" variant="ghost" onPress={() => navigation.goBack()} />
        </EmptyState>
      );
    }

    const stepIndex = RENEWAL_STEPS.findIndex((step) => step.key === renewal.status);
    const isFinal = stepIndex === RENEWAL_STEPS.length - 1;
    return (
      <FadeIn>
        <View style={[card, { paddingHorizontal: 12, paddingVertical: 20, marginBottom: 16 }]}>
          {/* Past the last step = every step complete. */}
          <StatusStepper steps={RENEWAL_STEPS} currentStep={isFinal ? RENEWAL_STEPS.length + 1 : stepIndex + 1} />
        </View>
        {/* A failed refresh keeps the earlier status on screen, marked as such (read-only). */}
        {stale ? <StaleDataNote onRetry={reload} style={{ marginTop: -8, marginBottom: 16 }} /> : null}

        <DetailCard
          title={RENEWALS_ARE_DEMO ? "Renewal request (demo)" : "Renewal request"}
          rows={[
            { label: "Status", value: <StatusBadge status={renewal.status} /> },
            { label: "Contract", value: contract.id },
            { label: "Unit", value: unitWithLocation(contract.unit, contract.location) },
            { label: "Current end date", value: formatDate(renewal.currentEndDate) },
            { label: "Renewal term", value: formatTerm(renewal.termMonths) },
            { label: "Proposed end date", value: formatDate(renewal.proposedEndDate), emphasize: true },
            { label: "Requested", value: formatDate(renewal.requestedOn) },
            ...(renewal.remark ? [{ label: "Remark", value: renewal.remark }] : []),
          ]}
        />

        {RENEWALS_ARE_DEMO ? (
          <InfoNote boxed style={{ marginBottom: 32 }}>
            Demo renewal — this request is kept in the app for this session and was not sent to MAZ. Your contract is
            unchanged.
          </InfoNote>
        ) : null}

        <AnimatedButton label="Back to contract" variant="ghost" onPress={() => navigation.goBack()} />

        {/* ⚠️ DEMO ONLY — stands in for MAZ reviewing the request. Remove with the mock provider. */}
        {RENEWALS_ARE_DEMO && !isFinal ? (
          <View style={{ alignItems: "center", marginTop: 16 }}>
            <TextLink onPress={advance.loading ? undefined : onAdvance}>
              <Text className="text-xs" style={{ color: colors.textSubtle }}>
                {advance.loading ? "Updating…" : "Demo mode: move to the next stage"}
              </Text>
            </TextLink>
            <ErrorBanner message={advance.error} onRetry={onAdvance} />
          </View>
        ) : null}
      </FadeIn>
    );
  };

  const base = HEADINGS[renewal?.status] ?? { title: "Renewal status", subtitle: undefined };
  const heading =
    renewal?.status === "approved" && RENEWALS_ARE_DEMO ? { ...base, title: `${base.title} (demo)` } : base;
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <PhotoHero
          photo="renewal"
          overlay="navy"
          minHeight={280}
          contentStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 26, justifyContent: "space-between" }}
        >
          <BackButton onHero onPress={() => navigation.goBack()} />
          <FadeIn key={heading.title} style={{ paddingTop: 56 }}>
            {contractId ? (
              <Text style={[TYPE.overline, { color: colors.onHeroMuted, marginBottom: 10 }]}>{`Contract ${contractId}`}</Text>
            ) : null}
            <Text accessibilityRole="header" style={[TYPE.screenTitle, { color: colors.onHero, marginBottom: 8 }]}>
              {heading.title}
            </Text>
            {heading.subtitle ? (
              <Text style={{ color: colors.onHeroMuted, fontSize: 15, lineHeight: 22 }}>{heading.subtitle}</Text>
            ) : null}
          </FadeIn>
        </PhotoHero>
        <View className="flex-1 px-6 pt-8 pb-10">{renderContent()}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
