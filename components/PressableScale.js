import { useState } from "react";
import { Animated, Pressable } from "react-native";
import * as Haptics from "expo-haptics";

// Shared press feedback for every tappable element: subtle scale-down + light haptic.
// Large surfaces (cards, rows) should pass a gentler scaleTo, e.g. 0.98. A short, critically damped spring —
// no overshoot, so presses feel precise rather than bouncy.
export default function PressableScale({
  onPress,
  scaleTo = 0.97,
  containerStyle,
  style,
  children,
  ...pressableProps
}) {
  // Lazy initializer: creates the Animated.Value once instead of on every render.
  const [scale] = useState(() => new Animated.Value(1));

  const animateTo = (toValue) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, containerStyle]}>
      <Pressable
        {...pressableProps}
        onPress={onPress}
        onPressIn={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          animateTo(scaleTo);
        }}
        onPressOut={() => animateTo(1)}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
