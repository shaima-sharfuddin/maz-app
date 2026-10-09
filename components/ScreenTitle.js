import { View, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { TYPE } from "../theme/theme";

// Standard heading block for every screen: optional eyebrow, title, subtitle, 32pt gap below.
export default function ScreenTitle({ eyebrow, title, subtitle, align = "left" }) {
  const { colors } = useTheme();
  const textAlign = align === "center" ? "center" : "left";

  return (
    <View className="mb-8">
      {eyebrow ? (
        <Text style={[TYPE.overline, { color: colors.accent, marginBottom: 10, textAlign }]}>{eyebrow}</Text>
      ) : null}
      <Text style={[TYPE.screenTitle, { color: colors.heading, marginBottom: 8, textAlign }]}>{title}</Text>
      {subtitle ? (
        <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}
