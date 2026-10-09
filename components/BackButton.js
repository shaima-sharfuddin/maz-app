import { Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "./PressableScale";
import { useTheme } from "../theme/ThemeContext";

// `onHero` — white, on a glass chip, for use over a photo hero or navy panel.
export default function BackButton({ onPress, onHero = false }) {
  const { colors } = useTheme();
  const color = onHero ? colors.onHero : colors.textSecondary;

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      containerStyle={{ alignSelf: "flex-start", marginBottom: 16 }}
      // 44x44pt minimum tap target
      style={[
        { minHeight: 44, minWidth: 44, flexDirection: "row", alignItems: "center" },
        onHero
          ? { backgroundColor: colors.heroGlass, borderRadius: 22, paddingLeft: 10, paddingRight: 14 }
          : { marginLeft: -4 },
      ]}
    >
      <Ionicons name="chevron-back" size={20} color={color} />
      <Text style={{ color, fontSize: 15, fontWeight: "500", marginLeft: 2 }}>Back</Text>
    </PressableScale>
  );
}
