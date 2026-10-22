import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "./PressableScale";
import FieldError from "./FieldError";
import { useTheme } from "../theme/ThemeContext";
import { RADIUS, TYPE } from "../theme/theme";

// One large, tappable answer to a question (e.g. "I have a CR" / "I need a new CR") — Airbnb-style (Visual system v2):
// an outlined card with a plain icon, title, description, an optional `footer` line and a radio circle. Selected = a
// thicker primary border, a faint tint and a filled radio.
export function ChoiceCard({ icon, title, description, footer, selected, onPress, style }) {
  const { colors } = useTheme();

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={[title, description, footer].filter(Boolean).join(". ")}
      containerStyle={[{ marginBottom: 12 }, style]}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        padding: selected ? 19 : 20,
        minHeight: 44,
        borderRadius: RADIUS.card,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.primary : colors.inputBorder,
        backgroundColor: selected ? colors.primaryTint : colors.surface,
      }}
    >
      <Ionicons name={icon} size={26} color={colors.text} style={{ marginRight: 16, marginTop: 1 }} />
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={[TYPE.cardTitle, { color: colors.text, marginBottom: 2 }]}>{title}</Text>
        <Text style={[TYPE.body, { color: colors.textMuted }]}>{description}</Text>
        {footer ? <Text style={[TYPE.caption, { color: colors.text, fontWeight: "600", marginTop: 8 }]}>{footer}</Text> : null}
      </View>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          marginTop: 2,
          borderColor: selected ? colors.primary : colors.inputBorder,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} /> : null}
      </View>
    </PressableScale>
  );
}

// FormField-compatible group of ChoiceCards: `options` [{ value, icon, title, description, footer? }].
export default function ChoiceCardGroup({ label, value, onChange, onBlur, error, options }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ marginBottom: 20 }}>
      {label ? <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>{label}</Text> : null}
      {options.map((option) => (
        <ChoiceCard
          key={option.value}
          {...option}
          selected={option.value === value}
          onPress={() => {
            onChange(option.value);
            onBlur?.();
          }}
        />
      ))}
      <FieldError message={error} />
    </View>
  );
}
