import { View, Text } from "react-native";

export default function TrustStats({ stats }) {
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      {stats.map((stat) => (
        <View
          key={stat.label}
          style={{
            flex: 1,
            backgroundColor: "rgba(255,255,255,0.04)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
            borderRadius: 16,
            paddingVertical: 16,
            paddingHorizontal: 8,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "700" }}>{stat.value}</Text>
          <Text style={{ color: "#94a3b8", fontSize: 12, marginTop: 4, textAlign: "center" }}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}
