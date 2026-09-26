import { Text } from "react-native";
import PressableScale from "./PressableScale";
import { useTheme } from "../theme/ThemeContext";

export default function BackButton({ onPress }) {
  const { colors } = useTheme();

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      containerStyle={{ alignSelf: "flex-start", marginBottom: 16 }}
      // 44x44pt minimum tap target
      style={{ minHeight: 44, minWidth: 44, justifyContent: "center" }}
    >
      <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{"←"} Back</Text>
    </PressableScale>
  );
}
