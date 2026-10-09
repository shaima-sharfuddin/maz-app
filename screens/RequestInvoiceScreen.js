import { useCallback } from "react";
import { View, Text, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import ScreenTitle from "../components/ScreenTitle";
import StatusBadge from "../components/StatusBadge";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import useSubmit from "../hooks/useSubmit";
import { fetchRequestStatus, errorMessage } from "../services/api";
import { formatBHD } from "../data/pricing";
import { formatDate } from "../utils/formatDate";
import { unitWithLocation } from "../utils/formatUnit";
import { downloadInvoicePdf } from "../utils/invoicePdf";
import { useTheme } from "../theme/ThemeContext";
import { useAuth } from "../auth/AuthContext";

function InvoiceSkeleton() {
  return (
    <SkeletonCard>
      <Skeleton width="40%" height={24} style={{ marginBottom: 24 }} />
      {[0, 1, 2, 3, 4].map((key) => (
        <Skeleton key={key} width={`${85 - key * 8}%`} height={12} style={{ marginBottom: 14 }} />
      ))}
      <Skeleton width="50%" height={28} style={{ marginTop: 10 }} />
    </SkeletonCard>
  );
}

// Label / value line inside the invoice. `strong` = bold value (subtotal, totals).
function Line({ label, value, strong = false }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ color: colors.textMuted, fontSize: 14, marginRight: 12 }}>{label}</Text>
      <Text style={{ flex: 1, textAlign: "right", color: colors.text, fontSize: 14, fontWeight: strong ? "700" : "500" }}>
        {value}
      </Text>
    </View>
  );
}

function Block({ title, children, first = false }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingVertical: 14,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.surfaceBorder,
      }}
    >
      {title ? (
        <Text className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: colors.accent }}>
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

// The first invoice of an office request (RequestStatus → "View full invoice", PaymentReceipt → "View
// invoice"), laid out as a document: issuer, number and dates, Bill To (the signed-in customer), what it's
// for, the line items and the total. Everything comes from the request (mock — see CLAUDE.md); VAT is shown
// only if the invoice carries it, and sample amounts are labelled as such. "Download invoice" renders the same
// content to a PDF and opens the share sheet (DEMO — utils/invoicePdf.js).
export default function RequestInvoiceScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const requestId = route.params?.requestId;
  const loadStatus = useCallback(() => fetchRequestStatus(requestId), [requestId]);
  const { loading, data, error, reload } = useAsync(loadStatus);
  const download = useSubmit(downloadInvoicePdf);

  const renderInvoice = () => {
    if (loading) return <InvoiceSkeleton />;
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load your invoice"
          message={errorMessage(error)}
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }
    const { invoice, payment, summary, unit } = data;
    if (!invoice) {
      return (
        <EmptyState
          icon="document-text-outline"
          title="Your invoice isn't ready yet"
          message="MAZ issues your invoice once a unit has been assigned to your request."
        >
          <AnimatedButton label="Back to request" variant="ghost" onPress={() => navigation.goBack()} />
        </EmptyState>
      );
    }

    const lineItems = invoice.lineItems ?? [];
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const hasVat = typeof invoice.vat === "number";
    const billTo = [user?.companyName, user?.name, user?.email].filter(Boolean);
    const onDownload = () => download.submit(data, billTo);

    return (
      <>
        <View
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            borderRadius: 16,
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 6,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <Image
              source={require("../assets/images/maz-logo-wordmark.png")}
              style={{ width: 96, height: 24 }}
              resizeMode="contain"
              accessibilityLabel="MAZ Business Center"
            />
            <StatusBadge status={payment ? "paid" : "unpaid"} />
          </View>

          <Block first>
            <Line label="Invoice no." value={invoice.number} />
            <Line label="Invoice date" value={formatDate(invoice.issuedOn)} />
            {payment ? (
              <Line label="Paid on" value={formatDate(payment.paidDate)} />
            ) : (
              <Line label="Due date" value={formatDate(invoice.dueDate)} />
            )}
            <Line label="Request" value={data.requestId} />
          </Block>

          {billTo.length > 0 ? (
            <Block title="Bill to">
              {billTo.map((line, index) => (
                <Text
                  key={index}
                  style={{
                    color: index === 0 ? colors.text : colors.textMuted,
                    fontSize: 14,
                    fontWeight: index === 0 ? "600" : "400",
                    lineHeight: 20,
                  }}
                >
                  {line}
                </Text>
              ))}
            </Block>
          ) : null}

          <Block title="Details">
            {summary?.plan ? <Line label="Service" value={summary.plan} /> : null}
            {summary?.term ? <Line label="Lease length" value={summary.term} /> : null}
            {summary?.paymentFrequency ? <Line label="Payment frequency" value={summary.paymentFrequency} /> : null}
            {unit ? <Line label="Unit" value={unitWithLocation(unit.name, unit.location)} /> : null}
          </Block>

          <Block title="Charges">
            {lineItems.map((item) => (
              <Line key={item.label} label={item.label} value={formatBHD(item.amount)} />
            ))}
            {hasVat ? (
              <>
                <Line label="Subtotal" value={formatBHD(subtotal)} strong />
                <Line label="VAT" value={formatBHD(invoice.vat)} />
              </>
            ) : null}
          </Block>

          <Block>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>Total</Text>
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>{formatBHD(invoice.amount)}</Text>
            </View>
            {summary?.isPlaceholder ? (
              <Text style={{ color: colors.textSubtle, fontSize: 12, lineHeight: 16, marginTop: 10 }}>
                Sample rate and deposit — MAZ confirms final pricing.
              </Text>
            ) : null}
          </Block>
        </View>

        {payment ? null : (
          <View className="mt-4">
            <AnimatedButton
              label={`Pay ${formatBHD(invoice.amount)}`}
              onPress={() => navigation.navigate("Payment", { requestId })}
            />
          </View>
        )}
        <View style={{ marginTop: payment ? 16 : 8 }}>
          <AnimatedButton
            label={download.loading ? "Preparing PDF…" : "Download invoice (PDF)"}
            variant={payment ? "primary" : "ghost"}
            onPress={onDownload}
            loading={download.loading}
          />
        </View>
        <ErrorBanner message={download.error} onRetry={onDownload} />
        <Text style={{ color: colors.textSubtle, fontSize: 12, lineHeight: 16, textAlign: "center", marginTop: 8 }}>
          Demo PDF generated on your device — not an official MAZ tax invoice.
        </Text>
      </>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />
          <ScreenTitle eyebrow={requestId ? `Request ${requestId}` : undefined} title="Invoice" />
          {renderInvoice()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
