import { useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { withAlpha } from "../theme/surfaces";
import { RADIUS } from "../theme/theme";
import { WORKSPACE_PHOTOS } from "../theme/imagery";

// Full-width environmental hero: a workspace photo (WORKSPACE_PHOTOS[photo]) under a scrim, content on top.
//   overlay "navy" — brand navy scrim, deepening downwards; content uses colors.onHero* (banners, document covers).
//   overlay "fade" — the photo dissolves into the page background; content uses the normal text colours
//                    (dashboard). Text sits in the lower, fully faded part.
// The photo fades in once decoded. `rounded` gives the hero the sheet-style rounded bottom.
export default function PhotoHero({ photo, overlay = "navy", height, minHeight, rounded = true, style, contentStyle, children }) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0));
  const source = WORKSPACE_PHOTOS[photo];
  const radius = rounded ? RADIUS.sheet : 0;

  const navy = colors.hero;
  const scrim =
    overlay === "navy"
      ? {
          backgroundColor: withAlpha(navy, 0.4),
          experimental_backgroundImage: `linear-gradient(to bottom, ${withAlpha(navy, 0.1)} 0%, ${withAlpha(
            navy,
            0.45
          )} 45%, ${withAlpha(navy, 0.92)} 100%)`,
        }
      : {
          experimental_backgroundImage: `linear-gradient(to bottom, ${withAlpha(colors.background, 0.12)} 0%, ${withAlpha(
            colors.background,
            0.3
          )} 38%, ${withAlpha(colors.background, 0.88)} 72%, ${withAlpha(colors.background, 1)} 100%)`,
        };

  return (
    <View
      style={[
        {
          height,
          minHeight,
          overflow: "hidden",
          borderBottomLeftRadius: radius,
          borderBottomRightRadius: radius,
          backgroundColor: overlay === "fade" ? colors.background : colors.hero,
        },
        style,
      ]}
    >
      {source ? (
        <Animated.Image
          source={source}
          resizeMode="cover"
          onLoad={() =>
            Animated.timing(opacity, {
              toValue: 1,
              duration: 600,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start()
          }
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[StyleSheet.absoluteFill, { opacity, width: "100%", height: "100%" }]}
        />
      ) : null}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, scrim]} />
      <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
    </View>
  );
}
