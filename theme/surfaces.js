import { useTheme } from "./ThemeContext";
import { RADIUS } from "./theme";

// The standard card surface: theme surface, 1px border, 16 radius and (light mode only) a soft shadow.
// Use it for every card instead of re-declaring these values: style={[card, { padding: 20 }]}.
export function useCardStyle() {
  const { colors, elevation } = useTheme();
  return {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: RADIUS.card,
    ...elevation.card,
  };
}

// The hero surface: navy panel, 20 radius, raised shadow in light mode. Content on it uses onHero* colours.
export function useHeroStyle() {
  const { colors, elevation } = useTheme();
  return {
    backgroundColor: colors.hero,
    borderWidth: 1,
    borderColor: colors.heroBorder,
    borderRadius: RADIUS.hero,
    ...elevation.hero,
  };
}

// "#rrggbb" + alpha → "rgba(r,g,b,a)" — for fades that must end exactly on a theme colour.
export function withAlpha(hex, alpha) {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((start) => parseInt(value.slice(start, start + 2), 16));
  return `rgba(${r},${g},${b},${alpha})`;
}
