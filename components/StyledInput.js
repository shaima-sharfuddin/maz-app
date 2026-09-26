import { useState } from "react";
import { View, Text, TextInput } from "react-native";

export default function StyledInput({ label, style, ...inputProps }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ color: "#cbd5e1", fontSize: 13, marginBottom: 8 }}>{label}</Text>
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
        placeholderTextColor="#64748b"
        style={[
          {
            backgroundColor: "rgba(255,255,255,0.08)",
            color: "#ffffff",
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderWidth: 1.5,
            borderColor: focused ? "#a31c37" : "rgba(255,255,255,0.1)",
          },
          style,
        ]}
      />
    </View>
  );
}