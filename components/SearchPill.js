import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "./PressableScale";
import { useTheme } from "../theme/ThemeContext";
import { RADIUS, TYPE } from "../theme/theme";

// Airbnb's "Where to?" pill, for MAZ: a raised rounded bar that starts a workspace search (opens Browse Plans). A
// navigation entry, not a text field — there's nothing to type yet.
export default function SearchPill({
  title = "Find your workspace",
  subtitle = "Office suites · CR registration",
  onPress,
  style,
}) {
  const { colors, elevation } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      containerStyle={style}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          minHeight: 60,
          paddingLeft: 20,
          paddingRight: 8,
          borderRadius: RADIUS.pill,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
        },
        elevation.card,
      ]}
    >
      <Ionicons name="search" size={20} color={colors.text} style={{ marginRight: 14 }} />
      <View style={{ flex: 1 }}>
        <Text style={[TYPE.label, { color: colors.text, fontWeight: "700" }]}>{title}</Text>
        <Text style={[TYPE.caption, { color: colors.textMuted, marginTop: 1 }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="options-outline" size={18} color={colors.text} />
      </View>
    </PressableScale>
  );
}
