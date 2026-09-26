import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "./PressableScale";
import { useTheme } from "../theme/ThemeContext";

// Shown when a submit fails (message from useSubmit's `error`). `onRetry` repeats the action.
export default function ErrorBanner({ message, onRetry, retryLabel = "Try again" }) {
  const { colors } = useTheme();
  if (!message) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.dangerSoft,
        borderRadius: 12,
        paddingLeft: 14,
        paddingRight: 6,
        paddingVertical: 6,
        marginTop: 12,
      }}
    >
      <Ionicons name="alert-circle" size={18} color={colors.danger} style={{ marginRight: 10 }} />
      <Text style={{ flex: 1, color: colors.danger, fontSize: 13, lineHeight: 18, paddingVertical: 6 }}>{message}</Text>
      {onRetry ? (
        <PressableScale
          onPress={onRetry}
          accessibilityRole="button"
          style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 10, justifyContent: "center" }}
        >
          <Text style={{ color: colors.danger, fontSize: 13, fontWeight: "700" }}>{retryLabel}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}
