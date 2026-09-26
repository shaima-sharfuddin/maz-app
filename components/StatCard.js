import { View, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";

// Headline number card, e.g. "Active contracts / 2 / 1 office · 1 incubator".
export default function StatCard({ label, value, caption, style }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
          borderRadius: 16,
          padding: 16,
        },
        style,
      ]}
    >
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 26, fontWeight: "700", marginTop: 6 }}>{value}</Text>
      {caption ? <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>{caption}</Text> : null}
    </View>
  );
}
