import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";
import { RADIUS } from "../theme/theme";

// Friendly placeholder for anything that can be empty (no lease, no meetings, no results, load errors).
// `dashed` marks content that is intentionally not available yet.
export default function EmptyState({ icon, title, message, dashed = false, children }) {
  const { colors } = useTheme();
  const card = useCardStyle();

  return (
    <View
      style={[
        dashed
          ? { borderWidth: 1, borderStyle: "dashed", borderColor: colors.dashedBorder, borderRadius: RADIUS.card }
          : card,
        { paddingHorizontal: 24, paddingVertical: 28, alignItems: "center" },
      ]}
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
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={{ color: colors.text, fontSize: 17, lineHeight: 24, fontWeight: "600", textAlign: "center", marginBottom: 6 }}>
        {title}
      </Text>
      {message ? (
        <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: "center", maxWidth: 320 }}>
          {message}
        </Text>
      ) : null}
      {children ? <View style={{ alignSelf: "stretch", marginTop: 20 }}>{children}</View> : null}
    </View>
  );
}
