import { View, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { TYPE } from "../theme/theme";

// The headline figure of a financial block: small uppercase label, then the amount large. `onHero` for the navy
// HeroPanel, `size` "display" (the one figure a screen is about) or "hero". `caption` sits under the amount.
export default function AmountHero({ label, amount, caption, onHero = false, size = "hero", muted = false, style }) {
  const { colors } = useTheme();
  const labelColor = onHero ? colors.onHeroMuted : colors.textMuted;
  const amountColor = onHero ? (muted ? colors.onHeroMuted : colors.onHero) : muted ? colors.textSecondary : colors.text;
  return (
    <View style={style} accessible accessibilityLabel={[label, amount, caption].filter(Boolean).join(", ")}>
      <Text style={[TYPE.overline, { color: labelColor, marginBottom: 6 }]}>{label}</Text>
      <Text
        style={[size === "display" ? TYPE.amountDisplay : TYPE.amountHero, { color: amountColor }]}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {amount}
      </Text>
      {caption ? (
        <Text style={[TYPE.caption, { color: onHero ? colors.onHeroSubtle : colors.textSubtle, marginTop: 6 }]}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}
