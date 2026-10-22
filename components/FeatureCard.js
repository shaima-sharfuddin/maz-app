import { useEffect } from "react";
import { View, Text, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import PressableScale from "./PressableScale";
import { useTheme } from "../theme/ThemeContext";
import { withAlpha } from "../theme/surfaces";
import { MOTION, PALETTE, RADIUS, TYPE } from "../theme/theme";

// Airbnb-style inspiration card (Visual system v2): a big rounded photo that drifts slowly (Ken Burns), a deep navy
// fall at the bottom, and the copy + a white pill ON the photo. One per screen at most. aspectRatio frames the photo
// (default square). Reduce motion → still photo.
export default function FeatureCard({ photo, eyebrow, title, body, cta, onPress, aspectRatio = 1, accessibilityLabel, style }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const zoom = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    zoom.set(withRepeat(withTiming(1.08, { duration: 14000, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduceMotion, zoom]);
  const photoStyle = useAnimatedStyle(() => ({ transform: [{ scale: zoom.value }] }));
  const deep = PALETTE.navyDeep;

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={MOTION.cardPressScale}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [eyebrow, title, body, cta].filter(Boolean).join(". ")}
      containerStyle={style}
      style={{ borderRadius: RADIUS.photo, overflow: "hidden", aspectRatio, backgroundColor: colors.skeleton }}
    >
      <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, photoStyle]}>
        <Image source={photo} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      </Animated.View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          experimental_backgroundImage: `linear-gradient(to bottom, ${withAlpha(deep, 0)} 35%, ${withAlpha(deep, 0.55)} 62%, ${withAlpha(
            deep,
            0.9
          )} 100%)`,
        }}
      />
      <View style={{ flex: 1, justifyContent: "flex-end", padding: 22 }}>
        {eyebrow ? (
          <Text style={[TYPE.overline, { color: withAlpha(PALETTE.ivory, 0.85), marginBottom: 8 }]}>{eyebrow}</Text>
        ) : null}
        <Text style={[TYPE.screenTitle, { fontSize: 26, lineHeight: 31, color: colors.onHero }]}>{title}</Text>
        {body ? <Text style={[TYPE.body, { color: colors.onHeroMuted, marginTop: 6, maxWidth: 300 }]}>{body}</Text> : null}
        {cta ? (
          <View
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              marginTop: 16,
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: RADIUS.pill,
              backgroundColor: PALETTE.white,
            }}
          >
            <Text style={[TYPE.label, { color: deep, fontWeight: "700" }]}>{cta}</Text>
            <Ionicons name="arrow-forward" size={16} color={deep} style={{ marginLeft: 6 }} />
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}
