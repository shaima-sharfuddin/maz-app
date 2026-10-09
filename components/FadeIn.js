import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";
import { MOTION } from "../theme/theme";

// Entrance motion for a section: fades in while rising a few points, decelerating — no bounce. `index` staggers
// consecutive sections (capped, so long lists never wait). Skipped entirely when the OS "Reduce motion" setting is on.
// Mount it with the content (e.g. once loading finishes) and the content settles in instead of popping.
export default function FadeIn({ index = 0, delay = 0, offset = MOTION.enterOffset, style, children }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
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
          duration: MOTION.enterDuration,
          delay: delay + Math.min(index, MOTION.maxStaggerSteps) * MOTION.stagger,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
        animation.start();
      });
    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [progress, index, delay]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] });
  return <Animated.View style={[{ opacity: progress, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}
