import { useCallback, useEffect, useState } from "react";
import { View, Text, Keyboard, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import PressableScale from "./PressableScale";
import { useTheme } from "../theme/ThemeContext";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, useReducedMotion } from "react-native-reanimated";
import { MOTION } from "../theme/theme";
import { useAccountState } from "../auth/AuthContext";
import { fetchUnreadCount } from "../services/api";

// The custom bottom tab bar (App.js MainTabs) — Airbnb-style (Visual system v2): a flat full-width bar under a hairline,
// every tab an icon over a label; the active tab is navy (bold label, filled icon that pops). Each tab's icon comes
// from its screen options (`tabIcon` / `tabIconActive`); the Alerts tab shows a crimson dot while there are unread
// notifications.
// The bar takes layout space (not absolutely positioned), so tab screens need no extra bottom padding.
export default function TabBar({ state, descriptors, navigation, insets }) {
  const { colors } = useTheme();
  const userState = useAccountState();
  const [unread, setUnread] = useState(0);
  const keyboardOpen = useKeyboardOpen();

  // Unread count: refreshed when the tabs regain focus (e.g. back from a payment) and on every tab switch
  // (e.g. leaving Alerts after "Mark all as read"). Best effort — a failure just hides the dot.
  const refreshUnread = useCallback(() => {
    let live = true;
    fetchUnreadCount(userState).then(
      (result) => live && setUnread(result?.count ?? 0),
      () => live && setUnread(0)
    );
    return () => {
      live = false;
    };
  }, [userState]);
  useFocusEffect(refreshUnread);
  useEffect(refreshUnread, [refreshUnread, state.index]);

  if (keyboardOpen) return null;

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        backgroundColor: colors.tabBar,
        borderTopWidth: 1,
        borderTopColor: colors.tabBarBorder,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 10),
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const focused = state.index === index;
        const showDot = route.name === "Notifications" && unread > 0;

        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        return (
          <PressableScale
            key={route.key}
            onPress={onPress}
            scaleTo={0.92}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={showDot ? `${label}, ${unread} unread` : label}
            containerStyle={{ flex: 1 }}
            style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}
          >
            <TabIcon
              focused={focused}
              name={focused ? (options.tabIconActive ?? options.tabIcon) : options.tabIcon}
              color={focused ? colors.tabActive : colors.tabInactive}
              dotColor={showDot ? colors.highlight : null}
              ringColor={colors.tabBar}
            />
            <Text
              numberOfLines={1}
              style={{
                marginTop: 4,
                fontSize: 11,
                lineHeight: 14,
                fontWeight: focused ? "700" : "500",
                color: focused ? colors.tabActive : colors.tabInactive,
              }}
            >
              {label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

// The tab's icon: pops (a quick 1 → 1.18 → 1 scale, UI thread) when its tab becomes active. Crimson unread dot.
function TabIcon({ focused, name, color, dotColor, ringColor }) {
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (focused && !reduceMotion) {
      scale.set(withSequence(withTiming(1.18, { duration: 120 }), withSpring(1, MOTION.pressSpring)));
    }
  }, [focused, reduceMotion, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Ionicons name={name} size={24} color={color} />
      {dotColor ? (
        <View
          style={{
            position: "absolute",
            top: -1,
            right: -3,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: dotColor,
            borderWidth: 2,
            borderColor: ringColor,
          }}
        />
      ) : null}
    </Animated.View>
  );
}

// Hide the bar while the keyboard is up (Android would otherwise push it above the keyboard).
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "android") return undefined;
    const show = Keyboard.addListener("keyboardDidShow", () => setOpen(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}
