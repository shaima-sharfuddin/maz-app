import { View, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";

// Titled card of label / value rows (contract, enquiry, violation details …).
// A row's value may be text or a node (e.g. a StatusBadge); `emphasize` bolds it. `children` go below the rows.
export default function DetailCard({ title, rows, children, style }) {
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
          paddingBottom: 6,
          marginBottom: 16,
        },
        style,
      ]}
    >
      {title ? <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 6 }}>{title}</Text> : null}
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
          {typeof row.value === "string" || typeof row.value === "number" ? (
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
          ) : (
            <View style={{ flex: 1, alignItems: "flex-end" }}>{row.value}</View>
          )}
        </View>
      ))}
      {children}
    </View>
  );
}
