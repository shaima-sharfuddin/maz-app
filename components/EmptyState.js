import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

// Friendly placeholder for anything that can be empty (no lease, no meetings, no results, load errors).
// `dashed` marks content that is intentionally not available yet.
export default function EmptyState({ icon, title, message, dashed = false, children }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        backgroundColor: dashed ? "transparent" : colors.surface,
        borderWidth: 1,
        borderStyle: dashed ? "dashed" : "solid",
        borderColor: dashed ? colors.dashedBorder : colors.surfaceBorder,
        borderRadius: 16,
        padding: 24,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primarySoft,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <Text className="text-lg font-semibold text-center mb-2" style={{ color: colors.text }}>
        {title}
      </Text>
      {message ? (
        <Text className="text-sm leading-5 text-center" style={{ color: colors.textMuted }}>
          {message}
        </Text>
      ) : null}
      {children ? <View style={{ alignSelf: "stretch", marginTop: 20 }}>{children}</View> : null}
    </View>
  );
}
