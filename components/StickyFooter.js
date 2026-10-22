import { View, Text, Pressable } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedButton from "./AnimatedButton";
import { useTheme } from "../theme/ThemeContext";
import { TYPE } from "../theme/theme";

// Airbnb's reserve bar (Visual system v2): pinned to the bottom of the screen under a hairline — the price on the left,
// the one main action on the right. Render it AFTER the screen's ScrollView (outside it) so it never scrolls away.
//   amount   — "BHD 1,300.000" (bold), caption — "Total · paid in full" under it
//   detailsLabel + onDetails — an underlined link under the price (e.g. "Price details" → BottomSheet)
//   label / onPress / loading / disabled — the action (AnimatedButton, compact)
// Without an amount the button takes the full width.
export default function StickyFooter({ amount, caption, detailsLabel, onDetails, label, onPress, loading, disabled, children }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const hasPrice = amount != null;
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.duration(320)}
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        backgroundColor: colors.background,
        paddingHorizontal: 24,
        paddingTop: 14,
        paddingBottom: Math.max(insets.bottom, 14),
      }}
    >
      {children}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {hasPrice ? (
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={[TYPE.cardTitle, { color: colors.text, fontWeight: "700", fontVariant: ["tabular-nums"] }]} numberOfLines={1} adjustsFontSizeToFit>
              {amount}
            </Text>
            {caption ? <Text style={[TYPE.caption, { color: colors.textMuted, marginTop: 1 }]}>{caption}</Text> : null}
            {detailsLabel && onDetails ? (
              <Pressable onPress={onDetails} accessibilityRole="button" hitSlop={10} style={{ alignSelf: "flex-start" }}>
                <Text style={[TYPE.caption, { color: colors.text, fontWeight: "600", textDecorationLine: "underline", marginTop: 2 }]}>
                  {detailsLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <View style={hasPrice ? null : { flex: 1 }}>
          <AnimatedButton label={label} onPress={onPress} loading={loading} disabled={disabled} fullWidth={!hasPrice} />
        </View>
      </View>
    </Animated.View>
  );
}
