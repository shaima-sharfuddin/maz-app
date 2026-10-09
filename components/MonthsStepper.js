import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "./PressableScale";
import FieldError from "./FieldError";
import { formatTerm } from "../data/pricing";
import { useTheme } from "../theme/ThemeContext";

// − / + button; inert and greyed out at the range limit.
function StepButton({ icon, onPress, disabled, accessibilityLabel }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: disabled ? colors.disabledBackground : colors.primarySoft,
      }}
    >
      <Ionicons name={icon} size={22} color={disabled ? colors.disabledText : colors.primary} />
    </PressableScale>
  );
}

// Whole-month picker: − / + buttons around the current value, plus quick-pick chips. FormField-compatible
// (value, onChange, onBlur, error). The buttons disable at min / max, so the value can't leave the range.
export default function MonthsStepper({ label, value, onChange, onBlur, error, min = 1, max = 36, quickPicks = [] }) {
  const { colors } = useTheme();
  const months = Number.isFinite(value) ? value : min;

  const set = (next) => {
    onChange(Math.min(max, Math.max(min, next)));
    onBlur?.();
  };

  return (
    <View style={{ marginBottom: 20 }}>
      {label ? <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>{label}</Text> : null}
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={`${label ?? "Months"}: ${formatTerm(months)}`}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => set(months + (event.nativeEvent.actionName === "increment" ? 1 : -1))}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.inputBackground,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: error ? colors.danger : colors.inputBorder,
          padding: 4,
        }}
      >
        <StepButton icon="remove" onPress={() => set(months - 1)} disabled={months <= min} accessibilityLabel="One month less" />
        <Text style={{ flex: 1, textAlign: "center", color: colors.text, fontSize: 16, fontWeight: "600" }}>
          {formatTerm(months)}
        </Text>
        <StepButton icon="add" onPress={() => set(months + 1)} disabled={months >= max} accessibilityLabel="One month more" />
      </View>

      {quickPicks.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {quickPicks.map((pick) => {
            const selected = pick === months;
            return (
              <PressableScale
                key={pick}
                onPress={() => set(pick)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={{
                  minHeight: 44,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.inputBorder,
                  backgroundColor: selected ? colors.primaryTint : colors.inputBackground,
                }}
              >
                <Text style={{ color: selected ? colors.text : colors.textMuted, fontSize: 13, fontWeight: selected ? "600" : "400" }}>
                  {formatTerm(pick)}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      ) : null}
      <FieldError message={error} />
    </View>
  );
}
