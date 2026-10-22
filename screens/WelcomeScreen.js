import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Image, StyleSheet, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { setStatusBarStyle } from "expo-status-bar";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import AnimatedButton from "../components/AnimatedButton";
import BrandMark from "../components/BrandMark";
import CountUp from "../components/CountUp";
import { TRUST_STATS, WELCOME_TAGLINE } from "../data/brand";
import { useTheme } from "../theme/ThemeContext";
import { withAlpha } from "../theme/surfaces";
import { BRAND, PALETTE, TYPE } from "../theme/theme";
import { prefetchActivityOptions } from "../services/api";

// Stock, NOT MAZ's own (generic modern offices — never caption them as MAZ's). assets/images/workspace/CREDITS.md.
// They crossfade one after another, each drifting slowly while it's shown (user, 2026-10-22: "in motion").
const PHOTOS = [
  require("../assets/images/workspace/welcome-lobby.jpg"),
  require("../assets/images/workspace/plans-office-suite.jpg"),
  require("../assets/images/workspace/welcome-lounge.jpg"), // replaced the unfinished-looking corridor (user, 2026-10-22)
];
const SLIDE_MS = 6000;

// A soft dark glow behind light text, so it stays readable over any part of any photo.
const READABLE = { textShadowColor: "rgba(10,18,34,0.55)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 };
const CROSSFADE_MS = 1400;

// One slideshow photo: fades in when it becomes the active one (and out when it stops being it) and drifts from
// 1.04 to 1.14 while shown. Reduce motion → only the first photo, still.
function Slide({ source, active, first, reduceMotion }) {
  const opacity = useSharedValue(first ? (reduceMotion ? 1 : 0) : 0);
  const scale = useSharedValue(1.04);
  useEffect(() => {
    if (reduceMotion) return;
    opacity.set(withTiming(active ? 1 : 0, { duration: active && first ? 900 : CROSSFADE_MS, easing: Easing.inOut(Easing.quad) }));
    if (active) {
      scale.set(1.04);
      scale.set(withTiming(1.14, { duration: SLIDE_MS + CROSSFADE_MS * 2, easing: Easing.linear }));
    }
  }, [active, first, reduceMotion, opacity, scale]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Image source={source} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
    </Animated.View>
  );
}

function PhotoSlideshow({ reduceMotion }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (reduceMotion) return undefined;
    const timer = setInterval(() => setActive((index) => (index + 1) % PHOTOS.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, [reduceMotion]);
  return PHOTOS.map((source, index) => (
    <Slide key={index} source={source} active={index === active} first={index === 0} reduceMotion={reduceMotion} />
  ));
}

// A light sweep that glides across the main button every few seconds — a quiet "start here".
function Shimmer({ reduceMotion, color }) {
  const x = useSharedValue(-1);
  useEffect(() => {
    if (reduceMotion) return;
    x.set(
      withDelay(
        1800,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
            withDelay(2600, withTiming(-1, { duration: 0 }))
          ),
          -1
        )
      )
    );
  }, [reduceMotion, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 260 }, { rotate: "18deg" }] }));
  if (reduceMotion) return null;
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: 999, overflow: "hidden", alignItems: "center" }]}
    >
      <Animated.View style={[{ width: 46, height: "180%", top: "-40%", backgroundColor: color }, style]} />
    </View>
  );
}

// Landing (2026-10-22 redesign, user request): a full-screen lobby photo that slowly drifts (Ken Burns), deep navy
// scrims top and bottom, and the content arriving in sequence — logo, the brand squares building, the headline word
// by word, the tagline, trust stats counting up, then the two pills (ivory "Get Started" with a passing shimmer,
// outlined "Log in"). Everything skips with Reduce motion. Supersedes the 2026-10-10 client-restored reception layout.
// The MAZ logo is shown transparent (no white chip) on a soft ivory veil at the top; the status bar uses dark icons
// while this screen is focused and returns to the theme's after.
export default function WelcomeScreen({ navigation }) {
  // Sign-up's Activities dropdown should open with its list ready — start loading it now.
  useEffect(() => prefetchActivityOptions(), []);
  const { colors, isDark } = useTheme();
  const reduceMotion = useReducedMotion();
  const tagline = WELCOME_TAGLINE;

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark"); // dark icons on the ivory veil, in either theme
      return () => setStatusBarStyle(isDark ? "light" : "dark");
    }, [isDark])
  );

  // Fit the screen (user, 2026-10-22): shorter phones get a tighter type scale and spacing, so the page shows without
  // scrolling (the ScrollView is only a safety net). Kept uncrowded: overline, headline, stats, tagline, buttons.
  const { height } = useWindowDimensions();
  const compact = height < 760;

  const deep = PALETTE.navyDeep;
  const navy = BRAND.navy;
  const ivory = PALETTE.ivory;
  const enter = (delay, from = FadeInUp) =>
    reduceMotion ? undefined : from.delay(delay).duration(520).easing(Easing.out(Easing.cubic));
  const words = tagline.headline.split(" ");

  return (
    <View style={{ flex: 1, backgroundColor: deep }}>
      <PhotoSlideshow reduceMotion={reduceMotion} />
      {/* Scrims: a soft ivory veil at the top (the transparent logo + dark status bar read on it), a deep navy fall at
          the bottom for the text. */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            experimental_backgroundImage: `linear-gradient(to bottom, ${withAlpha(ivory, 0.92)} 0%, ${withAlpha(
              ivory,
              0.55
            )} 12%, ${withAlpha(ivory, 0)} 24%, ${withAlpha(navy, 0)} 34%, ${withAlpha(navy, 0.6)} 46%, ${withAlpha(deep, 0.9)} 60%, ${withAlpha(deep, 0.98)} 76%, ${withAlpha(
              deep,
              1
            )} 100%)`,
          },
        ]}
      />

      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.canvas }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false} showsVerticalScrollIndicator={false}>
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: compact ? 12 : 20 }}>
            <Animated.View entering={enter(250, FadeInDown)}>
              {/* Transparent logo (no chip): the ivory veil behind it keeps the navy squares readable. */}
              <BrandMark width={96} bare />
            </Animated.View>

            <View style={{ flex: 1, minHeight: compact ? 24 : 80 }} />

            <Animated.Text entering={enter(500)} style={[TYPE.overline, { color: ivory, marginBottom: 12 }, READABLE]}>
              MAZ Business Center · Kingdom of Bahrain
            </Animated.Text>
            <Text accessibilityRole="header" accessibilityLabel={tagline.headline} style={{ marginBottom: compact ? 18 : 24 }}>
              {words.map((word, index) => (
                <Animated.Text
                  key={`${word}-${index}`}
                  entering={enter(620 + index * 90)}
                  style={[
                    TYPE.display,
                    { fontSize: compact ? 32 : 38, lineHeight: compact ? 38 : 44, color: colors.onHero },
                    READABLE,
                  ]}
                >
                  {word}
                  {index < words.length - 1 ? " " : ""}
                </Animated.Text>
              ))}
            </Text>

            {/* Trust stats — one quiet row between the headline and the call to action. */}
            <Animated.View
              entering={enter(1100)}
              style={{
                flexDirection: "row",
                paddingVertical: compact ? 10 : 14,
                marginBottom: compact ? 18 : 24,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: withAlpha(ivory, 0.2),
              }}
            >
              {TRUST_STATS.map((stat, index) => (
                <View
                  key={stat.label}
                  style={{
                    flex: 1,
                    paddingLeft: index > 0 ? 14 : 0,
                    borderLeftWidth: index > 0 ? 1 : 0,
                    borderLeftColor: withAlpha(ivory, 0.2),
                  }}
                >
                  <CountUp
                    value={stat.value}
                    delay={1200 + index * 120}
                    reduceMotion={reduceMotion}
                    style={[TYPE.statValue, { fontSize: compact ? 20 : 24, lineHeight: compact ? 26 : 30, color: colors.onHero }]}
                  />
                  <Text style={[TYPE.caption, { color: withAlpha(PALETTE.white, 0.82), marginTop: 2 }]}>{stat.label}</Text>
                </View>
              ))}
            </Animated.View>

            {/* The 2-minute promise sits right above "Get started": an ivory accent bar beside one clear line. */}
            <Animated.View
              entering={enter(1400)}
              style={{ flexDirection: "row", alignItems: "center", marginBottom: compact ? 14 : 18 }}
            >
              <View style={{ width: 3, alignSelf: "stretch", borderRadius: 2, backgroundColor: ivory, marginRight: 12 }} />
              <Text
                style={[
                  {
                    flex: 1,
                    color: colors.onHero,
                    fontSize: compact ? 15 : 16,
                    lineHeight: compact ? 21 : 23,
                    fontWeight: "500",
                    letterSpacing: 0.1,
                  },
                  READABLE,
                ]}
              >
                {tagline.line}
              </Text>
            </Animated.View>

            <Animated.View entering={enter(1550, FadeInDown)} style={{ gap: 12 }}>
              <View>
                <AnimatedButton label="Get started" variant="inverse" onPress={() => navigation.navigate("NewUserSignUp")} />
                <Shimmer reduceMotion={reduceMotion} color={withAlpha(PALETTE.white, 0.35)} />
              </View>
              <AnimatedButton label="Log in to your account" variant="heroOutline" onPress={() => navigation.navigate("Login")} />
            </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
