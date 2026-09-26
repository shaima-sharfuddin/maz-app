import { useState } from "react";
import { View, Text } from "react-native";
import PressableScale from "./PressableScale";
import { useTheme } from "../theme/ThemeContext";

export default function SectionCard({ title, subtitle, defaultExpanded = true, children }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderRadius: 16,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <PressableScale
        onPress={() => setExpanded((prev) => !prev)}
        scaleTo={0.98}
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
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{title}</Text>
          {subtitle ? (
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{subtitle}</Text>
          ) : null}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>{expanded ? "▲" : "▼"}</Text>
      </PressableScale>

      {expanded ? <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>{children}</View> : null}
    </View>
  );
}
