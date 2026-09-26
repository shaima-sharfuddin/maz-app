import { ActivityIndicator, Text, View } from "react-native";
import PressableScale from "./PressableScale";
import { useTheme } from "../theme/ThemeContext";

// disabled → greyed out, no press feedback (use for invalid forms: disabled={!isValid}).
// loading  → spinner beside the label, taps ignored (use with useSubmit's `loading`).
// Height never changes between states, so nothing shifts.
export default function AnimatedButton({ label, onPress, variant = "primary", disabled = false, loading = false }) {
  const { colors } = useTheme();
  const isPrimary = variant === "primary";
  const inactive = disabled || loading;

  const backgroundColor = !isPrimary ? "transparent" : disabled ? colors.disabledBackground : colors.primary;
  const textColor = disabled ? colors.disabledText : isPrimary ? colors.onPrimary : colors.textMuted;

  return (
    <PressableScale
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      containerStyle={{ width: "100%" }}
      style={{
        backgroundColor,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 20 }}>
        {loading ? <ActivityIndicator size="small" color={textColor} style={{ marginRight: 10 }} /> : null}
        <Text
          style={{
            color: textColor,
            fontSize: isPrimary ? 16 : 14,
            fontWeight: isPrimary ? "600" : "400",
            textAlign: "center",
          }}
        >
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}
