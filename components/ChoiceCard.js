import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "./PressableScale";
import FieldError from "./FieldError";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";
import { RADIUS, TYPE } from "../theme/theme";

// One large, tappable answer to a question (e.g. "I have a CR" / "I need a new CR"): navy icon tile (as on
// ServiceCard), title, description, an optional `footer` line, and a radio circle. Selected = primary border +
// filled radio.
export function ChoiceCard({ icon, title, description, footer, selected, onPress, style }) {
  const { colors } = useTheme();
  const card = useCardStyle();

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={[title, description, footer].filter(Boolean).join(". ")}
      containerStyle={[{ marginBottom: 12 }, style]}
      style={{
        ...card,
        flexDirection: "row",
        alignItems: "center",
        padding: 18,
        minHeight: 44,
        borderWidth: 1.5,
        borderColor: selected ? colors.primary : colors.surfaceBorder,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: RADIUS.md,
          backgroundColor: colors.hero,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
        }}
      >
        <Ionicons name={icon} size={22} color={colors.onHero} />
      </View>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={[TYPE.cardTitle, { color: colors.text, marginBottom: 2 }]}>{title}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>{description}</Text>
        {footer ? <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "600", marginTop: 6 }}>{footer}</Text> : null}
      </View>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
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
