import { useCallback, useEffect, useState } from "react";
import { View, Text, Keyboard, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import PressableScale from "./PressableScale";
import { useTheme } from "../theme/ThemeContext";
import { RADIUS } from "../theme/theme";
import { useAccountState } from "../auth/AuthContext";
import { fetchUnreadCount } from "../services/api";

// The custom bottom tab bar (App.js MainTabs): a floating pill above the bottom edge. The active tab is a navy pill
// with its icon + label; the others show their icon only (screen readers still get the label). Each tab's icon comes
// from its screen options (`tabIcon`); the Alerts tab shows a crimson dot while there are unread notifications.
// The bar takes layout space (not absolutely positioned), so tab screens need no extra bottom padding.
export default function TabBar({ state, descriptors, navigation, insets }) {
  const { colors, elevation } = useTheme();
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
      style={{
        backgroundColor: colors.background,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: 64,
          paddingHorizontal: 8,
          borderRadius: RADIUS.pill,
          backgroundColor: colors.tabBar,
          borderWidth: 1,
          borderColor: colors.tabBarBorder,
          ...elevation.card,
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
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={showDot ? `${label}, ${unread} unread` : label}
              containerStyle={{ flex: focused ? 2.2 : 1 }}
              style={{
                height: 48,
                minWidth: 44,
                borderRadius: RADIUS.pill,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingHorizontal: 10,
                backgroundColor: focused ? colors.tabActive : "transparent",
              }}
            >
              <View>
                <Ionicons
                  name={focused ? (options.tabIconActive ?? options.tabIcon) : options.tabIcon}
                  size={22}
                  color={focused ? colors.onPrimary : colors.tabInactive}
                />
                {showDot ? (
                  <View
                    style={{
                      position: "absolute",
                      top: -1,
                      right: -2,
                      width: 9,
                      height: 9,
                      borderRadius: 5,
                      backgroundColor: colors.highlight,
                      borderWidth: 1.5,
                      borderColor: colors.tabBar,
                    }}
                  />
                ) : null}
              </View>
              {focused ? (
                <Text numberOfLines={1} style={{ color: colors.onPrimary, fontSize: 13, fontWeight: "600" }}>
                  {label}
                </Text>
              ) : null}
            </PressableScale>
          );
        })}
      </View>
    </View>
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
