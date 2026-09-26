import { View, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";

export default function TrustStats({ stats }) {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      {stats.map((stat) => (
        <View
          key={stat.label}
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            borderRadius: 16,
            paddingVertical: 16,
            paddingHorizontal: 8,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>{stat.value}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: "center" }}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}
