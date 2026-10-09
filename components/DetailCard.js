import { View, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";
import { TYPE } from "../theme/theme";

// Label / value rows split by hairlines. A row's value may be text or a node (e.g. a StatusBadge); `emphasize`
// bolds it. `onHero` switches to the navy-panel colours. Shared by DetailCard, DocumentSheet and the hero panels.
export function DetailRows({ rows, onHero = false, firstDivider = false }) {
  const { colors } = useTheme();
  return rows.map((row, index) => (
    <View
      key={row.label}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderTopWidth: index === 0 && !firstDivider ? 0 : 1,
        borderTopColor: onHero ? colors.heroDivider : colors.divider,
      }}
    >
      <Text style={[TYPE.label, { color: onHero ? colors.onHeroMuted : colors.textMuted, marginRight: 12 }]}>
        {row.label}
      </Text>
      {typeof row.value === "string" || typeof row.value === "number" ? (
        <Text
          style={{
            flex: 1,
            textAlign: "right",
            color: onHero ? colors.onHero : colors.text,
            fontSize: row.emphasize ? 15 : 14,
            lineHeight: 20,
            fontWeight: row.emphasize ? "700" : "500",
            fontVariant: ["tabular-nums"],
          }}
        >
          {row.value}
        </Text>
      ) : (
        <View style={{ flex: 1, alignItems: "flex-end" }}>{row.value}</View>
      )}
    </View>
  ));
}

// Titled card of label / value rows (contract, enquiry, violation details …). `children` go below the rows.
export default function DetailCard({ title, rows, children, style }) {
  const { colors } = useTheme();
  const card = useCardStyle();

  return (
    <View style={[card, { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6, marginBottom: 16 }, style]}>
      {title ? <Text style={[TYPE.cardTitle, { color: colors.text, marginBottom: 6 }]}>{title}</Text> : null}
      <DetailRows rows={rows} />
      {children}
    </View>
  );
}
