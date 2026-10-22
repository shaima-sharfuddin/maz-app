import { Pressable } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, useReducedMotion } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { MOTION } from "../theme/theme";

// Shared press feedback for every tappable element: subtle scale-down + light haptic. Runs on the UI thread
// (Reanimated), so presses stay smooth while JS is busy. Large surfaces (cards, rows) should pass a gentler scaleTo,
// e.g. MOTION.cardPressScale. A stiff, critically damped spring — no wobble. Reduce motion → haptic only.
export default function PressableScale({
  onPress,
  scaleTo = MOTION.pressScale,
  containerStyle,
  style,
  children,
  ...pressableProps
}) {
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const animateTo = (toValue) => {
    if (!reduceMotion) scale.set(withSpring(toValue, MOTION.pressSpring));
  };

  return (
    <Animated.View style={[animatedStyle, containerStyle]}>
      <Pressable
        {...pressableProps}
        onPress={onPress}
        onPressIn={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
