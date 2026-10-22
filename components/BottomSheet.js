import { useEffect, useState } from "react";
import { Modal, Pressable, View, Text, ScrollView, useWindowDimensions } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { MOTION, RADIUS, TYPE } from "../theme/theme";

// Airbnb-style sheet (Visual system v2): slides up over a dimmed page, rounded top, close button + title. Tapping the
// backdrop or ✕ slides it away before it unmounts. No drag gesture (gesture-handler isn't installed).
export default function BottomSheet({ visible, onClose, title, children }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  // Mount as soon as it's asked to show (during render — React's "adjust state on prop change"); unmount only after
  // the slide-out finishes.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    const config = { duration: MOTION.sheetDuration, easing: Easing.out(Easing.cubic) };
    if (visible) {
      progress.set(withTiming(1, config));
    } else {
      progress.set(withTiming(0, { ...config, duration: 220 }, (done) => {
        if (done) runOnJS(setMounted)(false);
      }));
    }
  }, [visible, progress]);

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.value) * height * 0.6 }] }));

  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[{ flex: 1, backgroundColor: colors.backdrop }, backdrop]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: height * 0.85,
            backgroundColor: colors.sheet,
            borderTopLeftRadius: RADIUS.sheet,
            borderTopRightRadius: RADIUS.sheet,
            paddingBottom: insets.bottom + 16,
          },
          sheet,
        ]}
      >
        <View style={{ alignItems: "center", paddingTop: 10 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.divider }} />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.divider,
          }}
        >
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <Text style={[TYPE.cardTitle, { flex: 1, textAlign: "center", color: colors.text, marginRight: 44 }]}>
            {title}
          </Text>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8 }}>{children}</ScrollView>
      </Animated.View>
    </Modal>
  );
}
