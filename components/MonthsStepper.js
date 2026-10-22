import { View, Text } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "./PressableScale";
import FieldError from "./FieldError";
import { formatTerm } from "../data/pricing";
import { useTheme } from "../theme/ThemeContext";
import { RADIUS, TYPE } from "../theme/theme";

// Round outlined − / + button (Airbnb's guest counter); faint and inert at the range limit.
function StepButton({ icon, onPress, disabled, accessibilityLabel }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: disabled ? colors.divider : colors.inputBorder,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={icon} size={22} color={disabled ? colors.disabledText : colors.text} />
    </PressableScale>
  );
}

// Whole-month picker (Visual system v2): a big centred number between round − / + buttons — the number rolls in from
// below as it changes (UI thread; instant with Reduce motion) — plus quick-pick pills. FormField-compatible (value,
// onChange, onBlur, error). The buttons disable at min / max, so the value can't leave the range.
export default function MonthsStepper({ label, value, onChange, onBlur, error, min = 1, max = 36, quickPicks = [] }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const months = Number.isFinite(value) ? value : min;

  const set = (next) => {
    onChange(Math.min(max, Math.max(min, next)));
    onBlur?.();
  };

  return (
    <View style={{ marginBottom: 20 }}>
      {label ? <Text style={[TYPE.label, { color: colors.textMuted, marginBottom: 12 }]}>{label}</Text> : null}
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={`${label ?? "Months"}: ${formatTerm(months)}`}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => set(months + (event.nativeEvent.actionName === "increment" ? 1 : -1))}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 }}
      >
        <StepButton icon="remove" onPress={() => set(months - 1)} disabled={months <= min} accessibilityLabel="One month less" />
        <View style={{ alignItems: "center", flex: 1, overflow: "hidden" }}>
          <Animated.Text
            key={months}
            entering={reduceMotion ? undefined : FadeInDown.duration(180)}
            style={[TYPE.amountDisplay, { fontSize: 48, lineHeight: 56, color: colors.text }]}
          >
            {months}
          </Animated.Text>
          <Text style={[TYPE.label, { color: colors.textMuted }]}>{months === 1 ? "month" : "months"}</Text>
        </View>
        <StepButton icon="add" onPress={() => set(months + 1)} disabled={months >= max} accessibilityLabel="One month more" />
      </View>

      {quickPicks.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 18 }}>
          {quickPicks.map((pick) => {
            const selected = pick === months;
            return (
              <PressableScale
                key={pick}
                onPress={() => set(pick)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={{
                  minHeight: 40,
                  paddingHorizontal: 16,
                  borderRadius: RADIUS.pill,
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.inputBorder,
                  backgroundColor: selected ? colors.primary : colors.surface,
                }}
              >
                <Text style={[TYPE.label, { color: selected ? colors.onPrimary : colors.text, fontWeight: selected ? "600" : "400" }]}>
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
