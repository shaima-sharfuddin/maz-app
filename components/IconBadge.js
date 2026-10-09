import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

// Ionicon centred in a soft circle; the icon is half the circle's size. Used as a screen's hero icon
// (VerifyAccount, PaymentReceipt, PaymentFailed) or an avatar (Settings). tone: "primary" (brand) | "success" | "danger".
// `animate` plays a short confirmation on mount: the circle settles in (scale 0.8 → 1, fade) — no overshoot.
export default function IconBadge({ icon, size = 56, tone = "primary", animate = false, style }) {
  const { colors } = useTheme();
  const [progress] = useState(() => new Animated.Value(animate ? 0 : 1));

  useEffect(() => {
    if (!animate) return undefined;
    let animation;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduceMotion) => {
        if (cancelled) return;
        if (reduceMotion) {
          progress.setValue(1);
          return;
        }
        animation = Animated.timing(progress, {
          toValue: 1,
          duration: 420,
          delay: 80,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
        animation.start();
      });
    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [animate, progress]);

  const palette = {
    success: { background: colors.successSoft, icon: colors.success },
    danger: { background: colors.dangerSoft, icon: colors.danger },
  }[tone] ?? { background: colors.primarySoft, icon: colors.primary };
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.background,
          alignItems: "center",
          justifyContent: "center",
          opacity: progress,
          transform: [{ scale }],
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size / 2)} color={palette.icon} />
    </Animated.View>
  );
}
