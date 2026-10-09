import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "./PressableScale";
import { useTheme } from "../theme/ThemeContext";
import { TYPE } from "../theme/theme";

// Shown with read-only information whose refresh just failed (useAsync { keepDataOnError } → stale): the earlier
// data stays on screen, clearly marked as not refreshed. `onRetry` (optional) tries again.
export default function StaleDataNote({ onRetry, style }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }, style]}
    >
      <Ionicons name="cloud-offline-outline" size={14} color={colors.textSubtle} />
      <Text style={[TYPE.caption, { flex: 1, color: colors.textSubtle }]}>
        Couldn&apos;t refresh — showing earlier information.
      </Text>
      {onRetry ? (
        <PressableScale
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Try refreshing again"
          style={{ minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "flex-end" }}
        >
          <Text style={[TYPE.caption, { color: colors.textSecondary, fontWeight: "600" }]}>Try again</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}
