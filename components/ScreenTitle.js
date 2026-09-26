import { View, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";

// Standard heading block for every screen: optional eyebrow, 2xl title, subtitle, 32pt gap below.
export default function ScreenTitle({ eyebrow, title, subtitle, align = "left" }) {
  const { colors } = useTheme();
  const textAlign = align === "center" ? "text-center" : "";

  return (
    <View className="mb-8">
      {eyebrow ? (
        <Text
          className={`text-xs font-semibold uppercase tracking-widest mb-2 ${textAlign}`}
          style={{ color: colors.accent }}
        >
          {eyebrow}
        </Text>
      ) : null}
      <Text className={`text-2xl font-bold mb-2 ${textAlign}`} style={{ color: colors.text }}>
        {title}
      </Text>
      {subtitle ? (
        <Text className={`text-base leading-6 ${textAlign}`} style={{ color: colors.textMuted }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
