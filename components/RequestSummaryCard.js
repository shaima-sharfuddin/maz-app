import { View, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";

// Recap of an office request. summary: { plan, location, term, estimatedPrice, isPlaceholder? }
// isPlaceholder shows an on-screen note so sample values aren't mistaken for a real quote.
export default function RequestSummaryCard({ summary, title = "Request summary" }) {
  const { colors } = useTheme();

  const rows = [
    { label: "Plan", value: summary.plan },
    { label: "Location", value: summary.location },
    { label: "Term", value: summary.term },
    { label: "Estimated price", value: summary.estimatedPrice, emphasize: true },
  ];

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
          Sample location, term and price — final details are confirmed by MAZ after your request.
        </Text>
      ) : null}
    </View>
  );
}
