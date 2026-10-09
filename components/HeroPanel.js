import { View } from "react-native";
import BrandSquares from "./BrandSquares";
import { useTheme } from "../theme/ThemeContext";
import { useHeroStyle } from "../theme/surfaces";

// The navy panel for the one headline block of a screen (dashboard Payment, Payment Review amount, Settings
// profile). The brand staircase sits faintly in the top-right corner. Text on it uses colors.onHero / onHeroMuted /
// onHeroSubtle; buttons inside use the "inverse" (ivory) variant —
// a navy primary button would disappear on the navy panel.
export default function HeroPanel({ motif = true, style, children }) {
  const hero = useHeroStyle();
  const { colors } = useTheme();
  return (
    <View style={[hero, { overflow: "hidden" }, style]}>
      {motif ? (
        <BrandSquares
          size={14}
          gap={4}
          color={colors.heroDivider}
          style={{ position: "absolute", top: 18, right: 18 }}
        />
      ) : null}
      {children}
    </View>
  );
}
