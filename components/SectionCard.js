import { useEffect, useState } from "react";
import { Animated, Easing, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "./PressableScale";
import FadeIn from "./FadeIn";
import { useTheme } from "../theme/ThemeContext";
import { TYPE } from "../theme/theme";

// Uncontrolled by default (defaultExpanded). Pass `expanded` + `onToggle` to control it from the parent,
// e.g. to open a collapsed section that contains a validation error.
export default function SectionCard({ title, subtitle, defaultExpanded = true, expanded: expandedProp, onToggle, children }) {
  const { colors } = useTheme();
  const [expandedState, setExpandedState] = useState(defaultExpanded);
  const controlled = expandedProp !== undefined;
  const expanded = controlled ? expandedProp : expandedState;
  const toggle = () => (controlled ? onToggle?.(!expanded) : setExpandedState((prev) => !prev));

  // The chevron turns with the state; the revealed content settles in (FadeIn) instead of popping.
  const [rotation] = useState(() => new Animated.Value(expanded ? 1 : 0));
  useEffect(() => {
    Animated.timing(rotation, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [expanded, rotation]);
  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderRadius: 16,
        marginBottom: 32, // section spacing (mb-8) — each card is its own block of the form
        overflow: "hidden",
      }}
    >
      <PressableScale
        onPress={toggle}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[TYPE.cardTitle, { color: colors.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{subtitle}</Text>
          ) : null}
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </Animated.View>
      </PressableScale>

      {expanded ? (
        <FadeIn offset={4} style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
          {children}
        </FadeIn>
      ) : null}
    </View>
  );
}
