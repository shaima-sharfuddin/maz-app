import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FieldError from "./FieldError";
import PressableScale from "./PressableScale";
import { useTheme } from "../theme/ThemeContext";

// `error` (string) shows an inline message and a danger-colored border.
// `revealable` masks the value (for sensitive IDs like CPR / passport numbers) with a 44pt show / hide toggle.
export default function StyledInput({ label, style, error, revealable = false, ...inputProps }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.inputBorder;

  return (
    <View style={{ marginBottom: 20 }}>
      {label ? <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>{label}</Text> : null}
      <View>
        <TextInput
          {...(revealable
            ? // Masked, and kept out of password managers / autofill suggestions.
              { secureTextEntry: !revealed, autoComplete: "off", textContentType: "none", autoCorrect: false }
            : null)}
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
          accessibilityLabel={label ?? inputProps.accessibilityLabel}
          accessibilityHint={error || undefined}
          style={[
            {
              backgroundColor: colors.inputBackground,
              color: colors.text,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingRight: revealable ? 52 : 16,
              paddingVertical: 12,
              minHeight: 48,
              borderWidth: 1.5,
              borderColor,
            },
            style,
          ]}
        />
        {revealable ? (
          <PressableScale
            onPress={() => setRevealed((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? `Hide ${label}` : `Show ${label}`}
            containerStyle={{ position: "absolute", right: 2, top: 2, bottom: 2, justifyContent: "center" }}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name={revealed ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
          </PressableScale>
        ) : null}
      </View>
      <FieldError message={error} />
    </View>
  );
}

// Tells FormField to wire react-hook-form through onChangeText.
StyledInput.isTextField = true;
