import { useState } from "react";
import { View, Text, Pressable } from "react-native";

export default function SectionCard({ title, subtitle, defaultExpanded = true, children }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View
      style={{
        backgroundColor: "rgba(255,255,255,0.04)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        borderRadius: 16,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "600" }}>{title}</Text>
          {subtitle ? (
            <Text style={{ color: "#94a3b8", fontSize: 13, marginTop: 2 }}>{subtitle}</Text>
          ) : null}
        </View>
        <Text style={{ color: "#94a3b8", fontSize: 14 }}>{expanded ? "▲" : "▼"}</Text>
      </Pressable>

      {expanded ? <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>{children}</View> : null}
    </View>
  );
}
