import { View, Text } from "react-native";
import PressableScale from "./PressableScale";
import FieldError from "./FieldError";
import { useTheme } from "../theme/ThemeContext";

// Grid of time-slot pills (3 per row), FormField-compatible. `slots`: [{ value, label, disabled }].
// Unavailable slots are shown muted and can't be tapped; `error` adds an inline message.
export default function SlotPicker({ label, value, onChange, onBlur, error, slots }) {
  const { colors } = useTheme();

  return (
    <View style={{ marginBottom: 20 }}>
      {label ? <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>{label}</Text> : null}
      <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {slots.map((slot) => {
          const selected = slot.value === value;
          return (
            <PressableScale
              key={slot.value}
              onPress={() => {
                onChange(slot.value);
                onBlur?.();
              }}
              disabled={slot.disabled}
              accessibilityRole="radio"
              accessibilityLabel={slot.disabled ? `${slot.label}, unavailable` : slot.label}
              accessibilityState={{ selected, disabled: slot.disabled }}
              containerStyle={{ flexBasis: "30%", flexGrow: 1 }}
              style={{
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                borderWidth: 1.5,
                backgroundColor: selected ? colors.primary : slot.disabled ? colors.disabledBackground : colors.inputBackground,
                borderColor: selected ? colors.primary : error ? colors.danger : slot.disabled ? colors.disabledBackground : colors.inputBorder,
              }}
            >
              <Text
                style={{
                  color: selected ? colors.onPrimary : slot.disabled ? colors.disabledText : colors.text,
                  fontSize: 14,
                  fontWeight: selected ? "600" : "400",
                  textDecorationLine: slot.disabled ? "line-through" : "none",
                }}
              >
                {slot.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      <FieldError message={error} />
    </View>
  );
}
