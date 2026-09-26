import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import FieldError from "./FieldError";
import { useTheme } from "../theme/ThemeContext";

// `error` (string) shows an inline message and a danger-colored border.
export default function StyledInput({ label, style, error, ...inputProps }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.inputBorder;

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>{label}</Text>
      <TextInput
        {...inputProps}
        onFocus={(e) => {
          setFocused(true);
          inputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          inputProps.onBlur?.(e);
        }}
        placeholderTextColor={colors.textSubtle}
        selectionColor={colors.primary}
        accessibilityLabel={label}
        accessibilityHint={error || undefined}
        style={[
          {
            backgroundColor: colors.inputBackground,
            color: colors.text,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            minHeight: 48,
            borderWidth: 1.5,
            borderColor,
          },
          style,
        ]}
      />
      <FieldError message={error} />
    </View>
  );
}

// Tells FormField to wire react-hook-form through onChangeText.
StyledInput.isTextField = true;
