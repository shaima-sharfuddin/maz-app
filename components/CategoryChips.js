import { useEffect, useState } from "react";
import { ScrollView, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  interpolateColor,
  useReducedMotion,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme/ThemeContext";
import { TYPE } from "../theme/theme";

const UNDERLINE_EASING = Easing.out(Easing.cubic);

// Airbnb's category row: icon-over-label tabs scrolling sideways, the selected one dark with a short underline that
// SLIDES to the new tab (UI thread). Unselected tabs are muted. items: [{ value, label, icon }].
// `fit`: the tabs share the screen width equally (no sideways scroll) — for a short list such as the dashboard's
// All / Office Suites / CR Registration; the icon sits in a soft tile that fills navy when selected.
export default function CategoryChips({ items, value, onChange, fit = false, style }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [layouts, setLayouts] = useState({}); // value → { x, width }
  const x = useSharedValue(0);
  const width = useSharedValue(0);

  const selected = layouts[value];
  useEffect(() => {
    if (!selected) return;
    const config = { duration: reduceMotion ? 0 : 260, easing: UNDERLINE_EASING };
    x.set(withTiming(selected.x, config));
    width.set(withTiming(selected.width, config));
  }, [selected, reduceMotion, x, width]);

  const underline = useAnimatedStyle(() => ({ width: width.value, transform: [{ translateX: x.value }] }));

  if (fit) {
    return (
      <View style={[{ borderBottomWidth: 1, borderBottomColor: colors.divider }, style]}>
        <View style={{ flexDirection: "row", paddingHorizontal: 16 }}>
          {items.map((item) => (
            <FitTab
              key={item.value}
              item={item}
              active={item.value === value}
              reduceMotion={reduceMotion}
              onLayout={(event) => {
                const { x: left, width: w } = event.nativeEvent.layout;
                // The underline spans the middle of the tab, not its full share of the row.
                const inset = Math.max(8, w * 0.2);
                setLayouts((current) => ({ ...current, [item.value]: { x: left + inset, width: w - inset * 2 } }));
              }}
              onPress={() => {
                if (item.value === value) return;
                Haptics.selectionAsync().catch(() => {});
                onChange(item.value);
              }}
            />
          ))}
          <Animated.View
            pointerEvents="none"
            style={[
              { position: "absolute", bottom: 0, left: 0, height: 3, borderRadius: 1.5, backgroundColor: colors.primary },
              underline,
            ]}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[{ borderBottomWidth: 1, borderBottomColor: colors.divider }, style]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
        <View style={{ flexDirection: "row" }}>
          {items.map((item) => {
            const active = item.value === value;
            return (
              <Pressable
                key={item.value}
                onLayout={(event) => {
                  const { x: left, width: w } = event.nativeEvent.layout;
                  setLayouts((current) => ({ ...current, [item.value]: { x: left, width: w } }));
                }}
                onPress={() => {
                  if (active) return;
                  Haptics.selectionAsync().catch(() => {});
                  onChange(item.value);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={{ alignItems: "center", paddingTop: 6, paddingBottom: 12, marginRight: 28, minWidth: 44 }}
              >
                <Ionicons name={item.icon} size={24} color={active ? colors.text : colors.textMuted} />
                <Text
                  style={[
                    TYPE.caption,
                    { marginTop: 6, color: active ? colors.text : colors.textMuted, fontWeight: active ? "600" : "500" },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
          <Animated.View
            pointerEvents="none"
            style={[{ position: "absolute", bottom: 0, left: 0, height: 2, borderRadius: 1, backgroundColor: colors.text }, underline]}
          />
        </View>
      </ScrollView>
    </View>
  );
}

// A `fit` tab: an icon tile that fills navy (icon pops) when selected, over a one-line label.
function FitTab({ item, active, reduceMotion, onLayout, onPress }) {
  const { colors } = useTheme();
  const on = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    on.set(withTiming(active ? 1 : 0, { duration: reduceMotion ? 0 : 220, easing: UNDERLINE_EASING }));
  }, [active, reduceMotion, on]);

  const tile = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [colors.primarySoft, colors.primary]),
    transform: [{ scale: 0.92 + 0.08 * on.value }],
  }));

  return (
    <Pressable
      onLayout={onLayout}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      style={{ flex: 1, alignItems: "center", paddingTop: 6, paddingBottom: 12, paddingHorizontal: 4, minHeight: 44 }}
    >
      <Animated.View
        style={[{ width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" }, tile]}
      >
        <Ionicons name={item.icon} size={20} color={active ? colors.onPrimary : colors.primary} />
      </Animated.View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={[
          TYPE.caption,
          { marginTop: 8, textAlign: "center", color: active ? colors.text : colors.textMuted, fontWeight: active ? "700" : "500" },
        ]}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}
