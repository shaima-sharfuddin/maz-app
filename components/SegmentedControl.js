import { View, Text } from "react-native";
import PressableScale from "./PressableScale";
import FieldError from "./FieldError";
import { useTheme } from "../theme/ThemeContext";

// `error` shows an inline message + danger border (e.g. a required choice not made yet).
export default function SegmentedControl({ label, value, onChange, onBlur, error, options }) {
  const { colors } = useTheme();

  return (
    <View style={{ marginBottom: 20 }}>
      {label ? <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>{label}</Text> : null}
      <View
        accessibilityRole="radiogroup"
        style={{
          flexDirection: "row",
          backgroundColor: colors.inputBackground,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: error ? colors.danger : colors.inputBorder,
          padding: 4,
        }}
      >
        {options.map((option) => {
          // Options may be plain strings or { value, label } objects.
          const optionValue = typeof option === "string" ? option : option.value;
          const optionLabel = typeof option === "string" ? option : option.label;
          const selected = optionValue === value;
          return (
            <PressableScale
              key={optionValue}
              onPress={() => {
                onChange(optionValue);
                onBlur?.();
              }}
              containerStyle={{ flex: 1 }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={{
                alignItems: "center",
                justifyContent: "center",
                minHeight: 44,
                borderRadius: 9,
                backgroundColor: selected ? colors.primary : "transparent",
              }}
            >
              <Text
                style={{
                  color: selected ? colors.onPrimary : colors.textMuted,
                  fontSize: 14,
                  fontWeight: selected ? "600" : "400",
                }}
              >
                {optionLabel}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      <FieldError message={error} />
    </View>
  );
}
