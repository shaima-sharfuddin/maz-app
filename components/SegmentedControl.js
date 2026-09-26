import { View, Text, Pressable } from "react-native";

export default function SegmentedControl({ label, value, onChange, options }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ color: "#cbd5e1", fontSize: 13, marginBottom: 8 }}>{label}</Text>
      <View
        accessibilityRole="radiogroup"
        style={{
          flexDirection: "row",
          backgroundColor: "rgba(255,255,255,0.08)",
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: "rgba(255,255,255,0.1)",
          padding: 4,
        }}
      >
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: 9,
                backgroundColor: selected ? "#a31c37" : "transparent",
              }}
            >
              <Text style={{ color: selected ? "#ffffff" : "#94a3b8", fontSize: 14, fontWeight: selected ? "600" : "400" }}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
