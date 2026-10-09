import { useEffect, useState } from "react";
import { Animated, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";

// Placeholder block for content still loading from the API. A slow, gentle opacity
// pulse signals activity without adding distracting motion.
export function Skeleton({ width = "100%", height = 14, radius = 8, style }) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.skeleton, opacity }, style]}
    />
  );
}

// Card-shaped container matching the real cards, so layout doesn't jump when data arrives.
export function SkeletonCard({ children, style }) {
  const card = useCardStyle();

  return (
    <View
      accessibilityLabel="Loading"
      style={[
        card,
        {
          padding: 20,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
