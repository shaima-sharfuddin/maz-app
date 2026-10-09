import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "./PressableScale";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";
import { RADIUS, TYPE } from "../theme/theme";

// One payment method as a radio row (icon, label, description). Payment (New User invoice) and Payment Review.
export default function PaymentMethodOption({ method, selected, onSelect }) {
  const { colors } = useTheme();
  const card = useCardStyle();
  return (
    <PressableScale
      onPress={onSelect}
      scaleTo={0.98}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      containerStyle={{ marginBottom: 10 }}
      style={{
        ...card,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: selected ? colors.primaryTint : colors.surface,
        borderWidth: 1.5,
        borderColor: selected ? colors.primary : colors.surfaceBorder,
        padding: 16,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: RADIUS.md,
          backgroundColor: selected ? colors.primarySoft : colors.surfaceMuted,
          borderWidth: 1,
          borderColor: selected ? colors.primarySoft : colors.surfaceBorder,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
        }}
      >
        <Ionicons name={method.icon} size={20} color={selected ? colors.primary : colors.textSecondary} />
      </View>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={[TYPE.cardTitle, { color: colors.text }]}>{method.label}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{method.description}</Text>
      </View>
      <Ionicons
        name={selected ? "radio-button-on" : "radio-button-off"}
        size={22}
        color={selected ? colors.primary : colors.textSubtle}
      />
    </PressableScale>
  );
}
