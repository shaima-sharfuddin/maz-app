import { useState } from "react";
import { Animated, Pressable, Text } from "react-native";
import * as Haptics from "expo-haptics";

export default function AnimatedButton({ label, onPress, variant = "primary" }) {
  // Lazy initializer: creates the Animated.Value once instead of on every render.
  const [scale] = useState(() => new Animated.Value(1));
  const isPrimary = variant === "primary";

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], width: "100%" }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          backgroundColor: isPrimary ? "#a31c37" : "transparent",
          paddingVertical: 16,
          borderRadius: 12,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: isPrimary ? "#ffffff" : "#94a3b8",
            fontSize: isPrimary ? 16 : 14,
            fontWeight: isPrimary ? "600" : "400",
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}