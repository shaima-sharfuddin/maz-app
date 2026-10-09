import { ActivityIndicator, Text, View } from "react-native";
import PressableScale from "./PressableScale";
import { useTheme } from "../theme/ThemeContext";
import { RADIUS } from "../theme/theme";

// Pill-shaped buttons (premium redesign, 2026-10-10). variant:
//   "primary"   — filled navy (dark mode: lighter navy) — the one main action per screen
//   "brand"     — filled hero navy — a second, equally weighted main action
//   "inverse"   — filled ivory with a navy label — the main action ON a navy surface (HeroPanel), where a navy
//                 primary would disappear
//   "secondary" — outlined surface
//   "ghost"     — text-only tertiary action (e.g. Cancel)
// disabled → greyed out, no press feedback (use for invalid forms: disabled={!isValid}).
// loading  → spinner beside the label, taps ignored (use with useSubmit's `loading`).
// Height never changes between states, so nothing shifts.
export default function AnimatedButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
}) {
  const { colors } = useTheme();
  const inactive = disabled || loading;
  const filled = variant === "primary" || variant === "brand" || variant === "inverse";
  const strong = filled; // larger, bolder label

  // [background, label, border colour, border width] per variant.
  const looks = {
    primary: [colors.primary, colors.onPrimary, null, 0],
    brand: [colors.hero, colors.onHero, colors.heroBorder, 1],
    inverse: [colors.heroAction, colors.onHeroAction, null, 0],
    secondary: [colors.surface, colors.text, colors.inputBorder, 1],
    ghost: ["transparent", colors.textSecondary, null, 0],
  };
  const [background, labelColor, borderColor, borderWidth] = looks[variant] ?? looks.primary;
  const backgroundColor = disabled && filled ? colors.disabledBackground : background;
  const textColor = disabled ? colors.disabledText : labelColor;

  return (
    <PressableScale
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      containerStyle={{ width: "100%" }}
      style={{
        backgroundColor,
        borderWidth,
        borderColor: borderColor ?? "transparent",
        paddingVertical: 16 - borderWidth, // the border makes up the difference — same height in every variant
        borderRadius: RADIUS.pill,
        alignItems: "center",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 20 }}>
        {loading ? <ActivityIndicator size="small" color={textColor} style={{ marginRight: 10 }} /> : null}
        <Text
          style={{
            color: textColor,
            fontSize: strong ? 16 : 15,
            fontWeight: strong || variant === "secondary" ? "600" : "500",
            letterSpacing: strong ? 0.2 : 0,
            textAlign: "center",
          }}
        >
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}
