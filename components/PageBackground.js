import { View, useWindowDimensions } from "react-native";
import BrandSquares from "./BrandSquares";
import { useTheme } from "../theme/ThemeContext";
import { withAlpha } from "../theme/surfaces";

// The app-wide page background (2026-10-22, "rich and professional"): the page colour (light: warm ivory; dark: deep
// navy) with a soft navy glow washing down from the top and the brand's rising squares, faint, in the top-right corner.
// App.js renders it behind EVERY screen through the navigators' `screenLayout`, so screens give their root view
// colors.canvas (transparent) instead of colors.background. Purely decorative — never intercepts touches.
export default function PageBackground({ children }) {
  const { colors, isDark } = useTheme();
  const { height } = useWindowDimensions();
  const glow = colors.pageGlow;
  const strong = isDark ? 0.16 : 0.2;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: Math.round(height * 0.5),
          experimental_backgroundImage: `linear-gradient(to bottom, ${withAlpha(glow, strong)} 0%, ${withAlpha(
            glow,
            strong * 0.4
          )} 40%, ${withAlpha(glow, 0)} 100%)`,
        }}
      />
      {/* A warm counter-glow low on the page keeps the ivory from looking flat. */}
      {isDark ? null : (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: Math.round(height * 0.35),
            experimental_backgroundImage: `linear-gradient(to top, ${withAlpha(glow, 0.05)} 0%, ${withAlpha(glow, 0)} 100%)`,
          }}
        />
      )}
      <BrandSquares
        size={14}
        gap={5}
        color={withAlpha(glow, isDark ? 0.1 : 0.07)}
        style={{ position: "absolute", top: 56, right: -6 }}
      />
      {children}
    </View>
  );
}
