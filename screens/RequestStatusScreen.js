import { useCallback } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import StatusStepper from "../components/StatusStepper";
import StatusBadge from "../components/StatusBadge";
import RequestSummaryCard from "../components/RequestSummaryCard";
import DetailCard from "../components/DetailCard";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import TextLink from "../components/TextLink";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import useSubmit from "../hooks/useSubmit";
import { fetchRequestStatus, advanceRequestStage, errorMessage } from "../services/api";
import { REQUEST_STEPS } from "../data/requestSteps";
import { DEMO_NOTES, DEMO_REQUEST_STAGE_TEXT, DEMO_AFTER_PAYMENT_NEXT } from "../data/demoNotes";
import InfoNote from "../components/InfoNote";
import { formatBHD } from "../data/pricing";
import { formatDate } from "../utils/formatDate";
import { unitWithLocation } from "../utils/formatUnit";
import { useTheme } from "../theme/ThemeContext";

const cardStyle = (colors) => ({
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.surfaceBorder,
  borderRadius: 16,
  padding: 20,
  marginBottom: 16,
});

function StatusSkeleton() {
  return (
    <SkeletonCard style={{ marginBottom: 16 }}>
      {REQUEST_STEPS.map((step) => (
        <View key={step.key} style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <Skeleton width={28} height={28} radius={14} style={{ marginRight: 14 }} />
          <Skeleton width="55%" height={14} />
        </View>
      ))}
    </SkeletonCard>
  );
}

// ⚠️ The request is MOCK (services/mockApi.js): its stages are moved on by the demo control below, nothing is sent
// to MAZ and no emails go out. The stages keep their real labels (data/requestSteps.js — the live process), but the
// wording shown here is the demo's (data/demoNotes.js), so the screen never claims an email, a unit or a review.
const DEMO_STEPS = REQUEST_STEPS.map((step) => ({ ...step, ...DEMO_REQUEST_STAGE_TEXT[step.key] }));

// Heading for where the request is: just saved → in progress → invoice to pay → paid.
function headingFor(status) {
  if (status?.payment) {
    return { title: "Demo payment recorded", subtitle: "Your sample invoice is marked as paid in this app." };
  }
  if (status?.invoice) {
    return { title: "Your sample invoice is ready", subtitle: "Pay it with a demo payment to see the next step." };
  }
  if (status && status.currentStep > 1) {
    return { title: "Request in progress", subtitle: "This demo request moves forward when you use the demo link below." };
  }
  return { title: "Request saved", subtitle: "Your demo request is saved in this app." };
}

// The request's stage as a timeline (when each stage was reached, what happens next), plus what each stage
// unlocks: the assigned unit (step 4), the invoice and "Pay invoice" (step 5), then the payment. The real
// stage comes from fetchRequestStatus; in the demo it's moved on with advanceRequestStage (DEMO control at
// the bottom).
export default function RequestStatusScreen({ navigation, route }) {
  const { colors } = useTheme();
  const requestId = route.params?.requestId;
  const loadStatus = useCallback(() => fetchRequestStatus(requestId), [requestId]);
  // keepData: after the demo control moves the stage on, the old status stays up while it reloads.
  const { loading, data, error, reload } = useAsync(loadStatus, { keepData: true });
  const advance = useSubmit(advanceRequestStage);

  const summary = data?.summary ?? route.params?.summary;
  const { title, subtitle } = headingFor(data);

  const onAdvance = async () => {
    if (await advance.submit(requestId)) reload();
  };

  const renderStatus = () => {
    if (loading && !data) return <StatusSkeleton />;
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load your request status"
          message={errorMessage(error)}
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }
    // Once paid, every stage is complete.
    const step = data.payment ? REQUEST_STEPS.length + 1 : data.currentStep;
    const next = data.payment ? DEMO_AFTER_PAYMENT_NEXT : DEMO_STEPS[data.currentStep - 1]?.next;
    return (
      <>
        <View style={cardStyle(colors)}>
          <StatusStepper orientation="vertical" steps={DEMO_STEPS} currentStep={step} dates={data.stageReachedAt} />
          {next ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                marginTop: 20,
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: colors.surfaceBorder,
              }}
            >
              <Ionicons name="arrow-forward-circle-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
              <Text style={{ flex: 1, color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>Next: </Text>
                {next}
              </Text>
            </View>
          ) : null}
        </View>
      </>
    );
  };

  // Unit, invoice and payment details — only once the status has loaded without error.
  const renderDetails = () => {
    if (!data || error) return null;
    const { unit, invoice, payment, contract } = data;
    return (
      <>
        {unit ? (
          <DetailCard
            title={DEMO_NOTES.sampleUnitTitle}
            rows={[{ label: DEMO_NOTES.sampleUnitLabel, value: unitWithLocation(unit.name, unit.location) }]}
          />
        ) : null}

        {invoice ? (
          <DetailCard
            title="Invoice"
            rows={[
              { label: "Status", value: <StatusBadge status={payment ? "paid" : "unpaid"} /> },
              { label: "Invoice no.", value: invoice.number },
              ...(payment ? [] : [{ label: "Due date", value: formatDate(invoice.dueDate) }]),
              // First invoice = first installment + deposit, each on its own line.
              ...(invoice.lineItems ?? []).map((item) => ({ label: item.label, value: formatBHD(item.amount) })),
              { label: "Total", value: formatBHD(invoice.amount), emphasize: true },
            ]}
          >
            <View style={{ borderTopWidth: 1, borderTopColor: colors.surfaceBorder, paddingVertical: 2 }}>
              <TextLink align="left" onPress={() => navigation.navigate("RequestInvoice", { requestId })}>
                <Text className="text-sm font-medium" style={{ color: colors.text }}>
                  View full invoice
                </Text>
              </TextLink>
            </View>
          </DetailCard>
        ) : null}

        {contract ? (
          <DetailCard
            title="Your contract"
            rows={[{ label: "Status", value: <StatusBadge status={contract.status} /> }]}
          />
        ) : null}

        {payment ? (
          <DetailCard
            title="Payment"
            rows={[
              { label: "Paid on", value: formatDate(payment.paidDate) },
              { label: "Method", value: payment.method },
              { label: "Receipt", value: payment.receipt },
            ]}
          />
        ) : null}

        {invoice && !payment ? (
          <View style={{ marginTop: 8, marginBottom: 32 }}>
            <AnimatedButton
              label={`Pay ${formatBHD(invoice.amount)}`}
              onPress={() => navigation.navigate("Payment", { requestId })}
            />
          </View>
        ) : null}
      </>
    );
  };

  // ⚠️ DEMO ONLY — stands in for MAZ's admin moving the request on. Remove once the real API
  // reports the request's stage.
  const renderDemoControl = () => {
    if (!data || error || data.currentStep >= REQUEST_STEPS.length) return null;
    return (
      <View style={{ alignItems: "center", marginTop: 16 }}>
        <TextLink onPress={advance.loading ? undefined : onAdvance}>
          <Text className="text-xs" style={{ color: colors.textSubtle }}>
            {advance.loading ? "Updating…" : "Demo mode: move to the next stage"}
          </Text>
        </TextLink>
        <ErrorBanner message={advance.error} onRetry={onAdvance} />
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />

          <ScreenTitle eyebrow={requestId ? `Request ${requestId}` : undefined} title={title} subtitle={subtitle} />

          <InfoNote boxed style={{ marginBottom: 16 }}>
            {DEMO_NOTES.requestStatus}
          </InfoNote>

          {renderStatus()}
          {renderDetails()}

          {summary ? (
            <View className="mb-8">
              <RequestSummaryCard summary={summary} />
            </View>
          ) : null}

          {/* Back (above) retraces the request steps; this jumps straight to the dashboard. */}
          <AnimatedButton label="Back to dashboard" variant="ghost" onPress={() => navigation.popToTop()} />

          {renderDemoControl()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
