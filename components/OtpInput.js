import { useRef, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import FieldError from "./FieldError";
import { useTheme } from "../theme/ThemeContext";

// One-time-code entry: six boxes backed by a single hidden TextInput, so paste and the OS
// "copy code from SMS/email" autofill work. FormField-compatible (value / onChange / onBlur / error).
export default function OtpInput({ value = "", onChange, onBlur, error, length = 6, autoFocus = true, onComplete }) {
  const { colors } = useTheme();
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);

  const handleChange = (text) => {
    const digits = text.replace(/\D/g, "").slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  };

  return (
    <View style={{ marginBottom: 20 }}>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        accessibilityRole="none"
        style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}
      >
        {Array.from({ length }, (_, index) => {
          const char = value[index] ?? "";
          const isActive = focused && index === Math.min(value.length, length - 1);
          return (
            <View
              key={index}
              style={{
                flex: 1,
                maxWidth: 52,
                aspectRatio: 0.85,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: error ? colors.danger : isActive ? colors.primary : colors.inputBorder,
                backgroundColor: colors.inputBackground,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>{char}</Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        caretHidden
        accessibilityLabel={`Verification code, ${length} digits`}
        accessibilityHint={error || undefined}
        // Visually hidden but focusable; the boxes above render its value.
        style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
      />
      <FieldError message={error} />
    </View>
  );
}
