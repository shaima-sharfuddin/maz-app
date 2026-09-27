import { View, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";

// "Estimated amount" card: label/value rows, a large total and a small disclaimer note.
// Used by SelectTerm (new request) and RenewContract.
export default function EstimateCard({ title = "Estimated amount", rows, totalLabel = "Estimated total", total, note, style }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
          borderRadius: 16,
          paddingHorizontal: 20,
          paddingTop: 18,
          paddingBottom: 8,
        },
        style,
      ]}
    >
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 6 }}>{title}</Text>
      {rows.map((row) => (
        <View
          key={row.label}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.surfaceBorder,
          }}
        >
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>{row.label}</Text>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500" }}>{row.value}</Text>
        </View>
      ))}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingVertical: 14 }}>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>{totalLabel}</Text>
        {/* Same text box every render, so changing the inputs never shifts the layout. */}
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>{total}</Text>
      </View>
      {note ? (
        <Text style={{ color: colors.textSubtle, fontSize: 12, lineHeight: 16, paddingBottom: 6 }}>{note}</Text>
      ) : null}
    </View>
  );
}
