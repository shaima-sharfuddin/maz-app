import { useCallback } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import DocumentSheet from "../components/DocumentSheet";
import AmountHero from "../components/AmountHero";
import BrandMark from "../components/BrandMark";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import StatusBadge from "../components/StatusBadge";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import useSubmit from "../hooks/useSubmit";
import { fetchBill, PAYMENT_STATUS_NOTE, PAYMENTS_ARE_DEMO, errorMessage } from "../services/api";
import { formatBHD } from "../data/pricing";
import { formatDate, formatMonth } from "../utils/formatDate";
import { unitWithLocation } from "../utils/formatUnit";
import { paymentBadge } from "../utils/billStatus";
import { downloadBillPdf } from "../utils/invoicePdf";
import { useTheme } from "../theme/ThemeContext";
import { TYPE } from "../theme/theme";
import FadeIn from "../components/FadeIn";
import InfoNote from "../components/InfoNote";
import { useAuth } from "../auth/AuthContext";

// "View bill" from the recruiter wireframe, opened from ContractDetail (or PaymentReceipt's "View invoice") with
// { contractId, billNumber }. PLACEHOLDER layout: an in-app summary until MAZ confirms the real invoice format
// (PDF? VAT breakdown?). "Download invoice (PDF)" is a DEMO device-generated PDF (utils/invoicePdf.js).
export default function BillViewerScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { contractId, billNumber } = route.params ?? {};
  const loadBill = useCallback(() => fetchBill(contractId, billNumber), [contractId, billNumber]);
  const { loading, data: bill, error, reload } = useAsync(loadBill);
  const { user } = useAuth();
  const download = useSubmit(downloadBillPdf);

  const renderContent = () => {
    if (loading) {
      return (
        <View>
          <Skeleton width="25%" height={12} style={{ marginBottom: 10 }} />
          <Skeleton width="60%" height={26} style={{ marginBottom: 32 }} />
          {[0, 1].map((key) => (
            <SkeletonCard key={key} style={{ marginBottom: 16 }}>
              <Skeleton width="40%" height={16} style={{ marginBottom: 14 }} />
              <Skeleton width="90%" height={12} style={{ marginBottom: 8 }} />
              <Skeleton width="70%" height={12} />
            </SkeletonCard>
          ))}
        </View>
      );
    }
    if (error?.code === "NOT_FOUND") {
      return (
        <EmptyState
          icon="receipt-outline"
          title="This bill is no longer available"
          message="Your current contracts and bills are listed on your dashboard."
        >
          <AnimatedButton label="Back to dashboard" onPress={() => navigation.popToTop()} />
        </EmptyState>
      );
    }
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load this bill"
          message={errorMessage(error)}
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }

    // Real API bills have no period dates, only a label ("RENT INST-1 (Sep 2026 – Nov 2026)").
    const hasPeriodDates = Boolean(bill.periodStart && bill.periodEnd);
    const onDownload = () => download.submit(bill, [user?.companyName, user?.name, user?.email].filter(Boolean));
    // Unpaid (provisional rule) → Pay this bill → Payment Review (services/paymentService.js).
    const canPay = bill.status === "unpaid" || bill.status === "due";
    const billingPeriod = hasPeriodDates
      ? `${formatDate(bill.periodStart)} – ${formatDate(bill.periodEnd)}`
      : bill.periodLabel;

    // The bill as one financial document: header, the total as the dominant figure, then perforated sections.
    const header = (
      <View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <BrandMark bare width={84} />
          {bill.status ? <StatusBadge status={paymentBadge(bill.status, bill)} /> : null}
        </View>
        <Text style={[TYPE.overline, { color: colors.accent, marginBottom: 6 }]}>
          {hasPeriodDates ? `Bill · ${formatMonth(bill.periodStart)}` : "Bill"}
        </Text>
        <Text
          accessibilityRole="header"
          style={{ color: colors.text, fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: -0.3, fontVariant: ["tabular-nums"] }}
        >
          {bill.number}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 2 }}>
          {unitWithLocation(bill.unit, bill.location)}
        </Text>
        {/* Real MAZ bills: the paid rule isn't confirmed (services/billService.js). */}
        {bill.status && bill.statusProvisional ? (
          <Text style={[TYPE.caption, { color: colors.textSubtle, marginTop: 8 }]}>{PAYMENT_STATUS_NOTE}</Text>
        ) : null}
        {bill.status && bill.demoPaid ? (
          <Text style={[TYPE.caption, { color: colors.textSubtle, marginTop: 8 }]}>
            Demo payment this session — not sent to MAZ
          </Text>
        ) : null}
        <View
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 12,
            backgroundColor: colors.surfaceMuted,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
          }}
        >
          <AmountHero size="display" label="Total" amount={formatBHD(bill.total)} />
        </View>
      </View>
    );

    return (
      <View>
        <FadeIn>
          <DocumentSheet
            header={header}
            style={{ marginBottom: 24 }}
            sections={[
              {
                key: "details",
                title: "Details",
                rows: [
                  { label: "Contract", value: bill.contractId },
                  ...(billingPeriod ? [{ label: "Billing period", value: billingPeriod }] : []),
                  ...(bill.dueDate ? [{ label: "Due date", value: formatDate(bill.dueDate) }] : []),
                ],
              },
              {
                key: "charges",
                title: "Charges",
                children: (
                  <View style={{ paddingBottom: 10 }}>
                    {bill.lineItems.map((item, index) => (
                      <View
                        key={`${item.label}-${index}`}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          paddingVertical: 12,
                          borderTopWidth: index === 0 ? 0 : 1,
                          borderTopColor: colors.divider,
                        }}
                      >
                        <Text style={[TYPE.label, { flex: 1, color: colors.textMuted, marginRight: 12 }]}>{item.label}</Text>
                        <Text style={[TYPE.label, { color: colors.text, fontWeight: "500", fontVariant: ["tabular-nums"] }]}>
                          {formatBHD(item.amount)}
                        </Text>
                      </View>
                    ))}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderTopWidth: 1.5,
                        borderTopColor: colors.text,
                        marginTop: 4,
                        paddingTop: 14,
                      }}
                    >
                      <Text style={[TYPE.cardTitle, { color: colors.text, marginRight: 12 }]}>Total</Text>
                      <Text
                        style={[TYPE.value, { flexShrink: 1, color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: "700" }]}
                        adjustsFontSizeToFit
                        numberOfLines={1}
                      >
                        {formatBHD(bill.total)}
                      </Text>
                    </View>
                  </View>
                ),
              },
              bill.payment
                ? {
                    key: "payment",
                    title: "Payment",
                    rows: [
                      { label: "Paid on", value: formatDate(bill.payment.paidOn) },
                      { label: "Method", value: bill.payment.method },
                      { label: "Receipt", value: bill.payment.receipt },
                    ],
                  }
                : null,
              // ⚠️ DEMO — from the session-only demo payment (services/mock/demoPaymentLedger.js), not MAZ data.
              bill.demoPayment
                ? {
                    key: "demoPayment",
                    title: "Payment (demo)",
                    rows: [
                      { label: "Paid on", value: formatDate(bill.demoPayment.paidDate) },
                      { label: "Method", value: bill.demoPayment.method },
                      { label: "Demo receipt", value: bill.demoPayment.receipt },
                    ],
                  }
                : null,
            ]}
          />
        </FadeIn>

        {canPay ? (
          <FadeIn index={3} style={{ marginTop: 6 }}>
            <AnimatedButton
              label={`Pay this bill · ${formatBHD(bill.total)}`}
              onPress={() =>
                navigation.navigate("PaymentReview", {
                  scope: { type: "bill", contractId: bill.contractId, billNumber: bill.number },
                })
              }
            />
            {PAYMENTS_ARE_DEMO ? (
              <Text style={[TYPE.caption, { color: colors.textSubtle, textAlign: "center", marginTop: 10 }]}>
                Demo payment — no money is charged.
              </Text>
            ) : null}
          </FadeIn>
        ) : null}

        <View style={{ marginTop: canPay ? 8 : 6 }}>
          <AnimatedButton
            label={download.loading ? "Preparing PDF…" : "Download invoice (PDF)"}
            variant={canPay ? "ghost" : "primary"}
            onPress={onDownload}
            loading={download.loading}
          />
        </View>
        <ErrorBanner message={download.error} onRetry={onDownload} />

        <InfoNote style={{ marginTop: 20 }}>
          Bill summary — your official invoice is issued by MAZ Business Center. The PDF is a demo generated on your
          device.
        </InfoNote>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />
          {renderContent()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
