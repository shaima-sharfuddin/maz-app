import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

// Inline validation message shown under a form field.
export default function FieldError({ message }) {
  const { colors } = useTheme();
  if (!message) return null;

  return (
    <View
      style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 6 }}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Ionicons name="alert-circle" size={14} color={colors.danger} style={{ marginTop: 1, marginRight: 4 }} />
      <Text style={{ flex: 1, color: colors.danger, fontSize: 12, lineHeight: 16 }}>{message}</Text>
    </View>
  );
}
