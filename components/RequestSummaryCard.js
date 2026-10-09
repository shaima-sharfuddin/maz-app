import { View, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";

// Recap of an office request (build the summary with buildRequestSummary in data/pricing.js):
// { plan, location, term, paymentFrequency?, monthlyRate?, firstInstallment?, deposit?, firstInvoiceTotal?,
//   estimatedPrice, isPlaceholder? }. The first invoice = first installment + deposit, shown as separate
// lines then the total. Summaries without those fields (older requests) fall back to the estimated total.
// isPlaceholder shows an on-screen note so sample values aren't mistaken for a real quote.
export default function RequestSummaryCard({ summary, title = "Request summary" }) {
  const { colors } = useTheme();

  const rows = [
    { label: "Service", value: summary.plan },
    { label: "Location", value: summary.location },
    { label: "Lease length", value: summary.term },
    summary.paymentFrequency ? { label: "Payment frequency", value: summary.paymentFrequency } : null,
    summary.monthlyRate ? { label: "Monthly rate", value: summary.monthlyRate } : null,
    ...(summary.firstInvoiceTotal
      ? [
          { label: "First installment", value: summary.firstInstallment },
          { label: "Deposit", value: summary.deposit },
          { label: "First invoice total", value: summary.firstInvoiceTotal, emphasize: true },
        ]
      : [{ label: "Estimated total", value: summary.estimatedPrice, emphasize: true }]),
  ].filter(Boolean);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 6,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 6 }}>{title}</Text>
      {rows.map((row, index) => (
        <View
          key={row.label}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            borderTopWidth: index === 0 ? 0 : 1,
            borderTopColor: colors.surfaceBorder,
          }}
        >
          <Text style={{ color: colors.textMuted, fontSize: 14, marginRight: 12 }}>{row.label}</Text>
          <Text
            style={{
              flex: 1,
              textAlign: "right",
              color: colors.text,
              fontSize: 14,
              fontWeight: row.emphasize ? "700" : "500",
            }}
          >
            {row.value}
          </Text>
        </View>
      ))}
      {summary.isPlaceholder ? (
        <Text
          style={{
            color: colors.textSubtle,
            fontSize: 12,
            lineHeight: 16,
            paddingTop: 10,
            paddingBottom: 8,
            borderTopWidth: 1,
            borderTopColor: colors.surfaceBorder,
          }}
        >
          Sample location, rate and deposit — final details are confirmed by MAZ after your request.
        </Text>
      ) : null}
    </View>
  );
}
