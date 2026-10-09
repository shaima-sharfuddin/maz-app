import { View, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";

// The approved trust stats (data/brand.js). variant "tiles" (default — one card each) or "inline" (a single row
// split by hairlines, no cards — for hero compositions such as Welcome and Browse Plans).
export default function TrustStats({ stats, variant = "tiles" }) {
  const { colors } = useTheme();
  const card = useCardStyle();

  if (variant === "inline") {
    return (
      <View style={{ flexDirection: "row" }}>
        {stats.map((stat, index) => (
          <View
            key={stat.label}
            style={{
              flex: 1,
              paddingLeft: index > 0 ? 14 : 0,
              borderLeftWidth: index > 0 ? 1 : 0,
              borderLeftColor: colors.surfaceBorder,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 24,
                lineHeight: 30,
                fontWeight: "700",
                letterSpacing: -0.5,
                fontVariant: ["tabular-nums"],
              }}
            >
              {stat.value}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 2 }}>{stat.label}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      {stats.map((stat) => (
        <View key={stat.label} style={[card, { flex: 1, paddingVertical: 20, paddingHorizontal: 8, alignItems: "center" }]}>
          {/* The number carries the tile: large and heavy against a small muted caption. */}
          <Text
            style={{
              color: colors.text,
              fontSize: 32,
              lineHeight: 36,
              fontWeight: "800",
              letterSpacing: -0.5,
              fontVariant: ["tabular-nums"],
            }}
          >
            {stat.value}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 6, textAlign: "center" }}>
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
