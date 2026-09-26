import { Text } from "react-native";
import PressableScale from "./PressableScale";
import { useTheme } from "../theme/ThemeContext";

export default function AnimatedButton({ label, onPress, variant = "primary" }) {
  const { colors } = useTheme();
  const isPrimary = variant === "primary";

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      containerStyle={{ width: "100%" }}
      style={{
        backgroundColor: isPrimary ? colors.primary : "transparent",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: isPrimary ? colors.onPrimary : colors.textMuted,
          fontSize: isPrimary ? 16 : 14,
          fontWeight: isPrimary ? "600" : "400",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}
