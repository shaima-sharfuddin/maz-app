import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { useTheme } from "../theme/ThemeContext";

export default function StyledInput({ label, style, ...inputProps }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

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
        style={[
          {
            backgroundColor: colors.inputBackground,
            color: colors.text,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            minHeight: 48,
            borderWidth: 1.5,
            borderColor: focused ? colors.primary : colors.inputBorder,
          },
          style,
        ]}
      />
    </View>
  );
}
