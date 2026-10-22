import { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import CountUp from "./CountUp";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";
import { TYPE } from "../theme/theme";

const CARD_STAGGER_MS = 90;

// The approved trust stats (data/brand.js). variant "tiles" (default — one card each), "inline" (a single row
// split by hairlines, no cards — for hero compositions such as Welcome and Browse Plans) or "cards" (animated stat
// cards with an icon tile and a counting number — dashboard "Why MAZ"). "cards": `play` starts the entrance (pass
// false until the row scrolls into view; omitted = at once), `startIndex` continues the stagger from a previous row.
// Two or fewer stats lay out sideways (icon beside the figure) so a short row still fills the width evenly.
export default function TrustStats({ stats, variant = "tiles", play = true, startIndex = 0 }) {
  const { colors } = useTheme();
  const card = useCardStyle();

  if (variant === "cards") {
    const wide = stats.length <= 2;
    return (
      <View style={{ flexDirection: "row", gap: 10 }}>
        {stats.map((stat, index) => (
          <StatCard key={stat.label} stat={stat} wide={wide} play={play} index={startIndex + index} />
        ))}
      </View>
    );
  }

  if (variant === "inline") {
    return (
      <View style={{ flexDirection: "row" }}>
        {stats.map((stat, index) => (
          <View
            key={stat.label}
            style={{
              flex: 1,
              paddingLeft: index > 0 ? 14 : 0,
              borderLeftWidth: index > 0 ? 1 : 0,
              borderLeftColor: colors.surfaceBorder,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 24,
                lineHeight: 30,
                fontWeight: "700",
                letterSpacing: -0.5,
                fontVariant: ["tabular-nums"],
              }}
            >
              {stat.value}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 2 }}>{stat.label}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      {stats.map((stat) => (
        <View key={stat.label} style={[card, { flex: 1, paddingVertical: 20, paddingHorizontal: 8, alignItems: "center" }]}>
          {/* The number carries the tile: large and heavy against a small muted caption. */}
          <Text
            style={{
              color: colors.text,
              fontSize: 32,
              lineHeight: 36,
              fontWeight: "800",
              letterSpacing: -0.5,
              fontVariant: ["tabular-nums"],
            }}
          >
            {stat.value}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 6, textAlign: "center" }}>
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// One "cards" stat: rises, fades and settles (spring, no wobble) in turn; the figure counts up once it's in.
function StatCard({ stat, wide, play, index }) {
  const { colors } = useTheme();
  const card = useCardStyle();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const delay = index * CARD_STAGGER_MS;

  useEffect(() => {
    if (!play) return;
    if (reduceMotion) {
      progress.set(1);
      return;
    }
    progress.set(withDelay(delay, withSpring(1, { damping: 18, stiffness: 140, mass: 0.8 })));
  }, [play, reduceMotion, delay, progress]);

  const entrance = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 1.4),
    transform: [{ translateY: (1 - progress.value) * 18 }, { scale: 0.94 + 0.06 * progress.value }],
  }));

  const iconScale = useSharedValue(reduceMotion ? 1 : 0.4);
  useEffect(() => {
    if (!play || reduceMotion) return;
    iconScale.set(withDelay(delay + 140, withTiming(1, { duration: 360, easing: Easing.out(Easing.back(2)) })));
  }, [play, reduceMotion, delay, iconScale]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));

  const icon = (
    <Animated.View
      style={[
        {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.primarySoft,
        },
        iconStyle,
      ]}
    >
      <Ionicons name={stat.icon ?? "checkmark-outline"} size={18} color={colors.primary} />
    </Animated.View>
  );

  const figure = (
    <CountUp
      value={play || reduceMotion ? stat.value : "0"}
      delay={delay + 120}
      duration={1000}
      reduceMotion={reduceMotion}
      style={{
        color: colors.text,
        fontSize: 24,
        lineHeight: 30,
        fontWeight: "800",
        letterSpacing: -0.5,
        fontVariant: ["tabular-nums"],
      }}
    />
  );

  return (
    <Animated.View
      accessible
      accessibilityLabel={`${stat.value} ${stat.label}`}
      style={[
        card,
        { flex: 1, padding: 14 },
        wide ? { flexDirection: "row", alignItems: "center" } : { alignItems: "flex-start" },
        entrance,
      ]}
    >
      {icon}
      <View style={wide ? { marginLeft: 12, flex: 1 } : { marginTop: 12 }}>
        {figure}
        <Text style={[TYPE.caption, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={2}>
          {stat.label}
        </Text>
      </View>
    </Animated.View>
  );
}
