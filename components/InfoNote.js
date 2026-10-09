import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { RADIUS, TYPE } from "../theme/theme";

// A quiet notice (demo / provisional disclaimers): info icon + caption text. `boxed` puts it on the soft info
// background (the dashboard demo banner); otherwise it's an inline caption line.
export default function InfoNote({ children, boxed = false, icon = "information-circle-outline", style }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        { flexDirection: "row", gap: boxed ? 10 : 8 },
        boxed
          ? { backgroundColor: colors.infoSoft, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12 }
          : null,
        style,
      ]}
    >
      <Ionicons name={icon} size={16} color={boxed ? colors.info : colors.textSubtle} />
      <Text style={[TYPE.caption, { flex: 1, color: boxed ? colors.textSecondary : colors.textSubtle }]}>{children}</Text>
    </View>
  );
}
