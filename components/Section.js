import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "./PressableScale";
import { useTheme } from "../theme/ThemeContext";
import { MOTION, TYPE } from "../theme/theme";

// Airbnb-style page section (Visual system v2): content separated by a full-width hairline instead of a boxed card.
// `first` drops the top hairline. title 18/700, optional subtitle, optional `action` { label, onPress } — an underlined
// link beside the title (Airbnb's "Edit").
export function Section({ title, subtitle, action, first = false, children, style }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        { paddingVertical: 24, borderTopWidth: first ? 0 : 1, borderTopColor: colors.divider },
        style,
      ]}
    >
      {title ? (
        <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: subtitle ? 4 : 14 }}>
          <Text accessibilityRole="header" style={[TYPE.sectionTitle, { flex: 1, color: colors.text }]}>
            {title}
          </Text>
          {action ? (
            <Pressable onPress={action.onPress} accessibilityRole="button" hitSlop={12}>
              <Text style={[TYPE.label, { color: colors.text, fontWeight: "600", textDecorationLine: "underline" }]}>
                {action.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {subtitle ? <Text style={[TYPE.body, { color: colors.textMuted, marginBottom: 14 }]}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

// A row inside a Section: optional icon, label (+ caption), right-aligned value, chevron when tappable.
// `strong` = bold label and value (totals).
export function ListRow({ icon, label, caption, value, onPress, strong = false, style }) {
  const { colors } = useTheme();
  const body = (
    <View style={[{ flexDirection: "row", alignItems: "center", paddingVertical: 10, minHeight: 44 }, style]}>
      {icon ? <Ionicons name={icon} size={22} color={colors.text} style={{ marginRight: 16 }} /> : null}
      <View style={{ flex: 1, marginRight: value != null || onPress ? 12 : 0 }}>
        <Text style={[TYPE.body, { color: colors.text, fontWeight: strong ? "700" : "400" }]}>{label}</Text>
        {caption ? <Text style={[TYPE.caption, { color: colors.textMuted, marginTop: 2 }]}>{caption}</Text> : null}
      </View>
      {value != null ? (
        typeof value === "string" ? (
          <Text
            style={[
              TYPE.body,
              { color: colors.text, fontWeight: strong ? "700" : "400", fontVariant: ["tabular-nums"], textAlign: "right", flexShrink: 1 },
            ]}
          >
            {value}
          </Text>
        ) : (
          value
        )
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginLeft: 8 }} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <PressableScale onPress={onPress} scaleTo={MOTION.cardPressScale} accessibilityRole="button">
      {body}
    </PressableScale>
  );
}
