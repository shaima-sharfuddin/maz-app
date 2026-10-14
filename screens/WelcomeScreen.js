import { useEffect } from "react";
import { View, Text, ScrollView, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import TrustStats from "../components/TrustStats";
import FadeIn from "../components/FadeIn";
import PhotoHero from "../components/PhotoHero";
import { TRUST_STATS, WELCOME_TAGLINE } from "../data/brand";
import { useTheme } from "../theme/ThemeContext";
import { TYPE } from "../theme/theme";
import { prefetchActivityOptions } from "../services/api";

// MAZ's real reception photo dissolving into the page, a tagline, the trust stats (data/brand.js TRUST_STATS) and
// the two equally weighted paths (client feedback, 2026-10-07): New User → NewUserSignUp, Existing User → Login.
// Headline "Welcome to your workspace." + a supporting line, the same for everyone (data/brand.js WELCOME_TAGLINE).
export default function WelcomeScreen({ navigation }) {
  // Sign-up's Activities dropdown should open with its list ready — start loading it now.
  useEffect(() => prefetchActivityOptions(), []);
  const { colors } = useTheme();
  const tagline = WELCOME_TAGLINE;
  const { height } = useWindowDimensions();
  const heroHeight = Math.round(Math.min(560, Math.max(340, height * 0.56)));

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* ScrollView so the content never clips on small phones or with large accessibility text. */}
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
        {/* No BrandMark chip here: the photo already shows MAZ's real logo on the reception wall. */}
        <PhotoHero photo="welcome" overlay="fade" rounded={false} height={heroHeight} />

        {/* The text starts inside the hero's fully faded lower part. */}
        <View className="flex-1 px-6 pb-10" style={{ marginTop: -Math.round(heroHeight * 0.3) }}>
          <FadeIn index={1}>
            <Text style={[TYPE.overline, { color: colors.accent, marginBottom: 12 }]}>MAZ Business Center</Text>
            <Text accessibilityRole="header" style={[TYPE.display, { color: colors.text, marginBottom: 12 }]}>
              {tagline.headline}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 16, lineHeight: 24, marginBottom: 28, maxWidth: 340 }}>
              {tagline.line}
            </Text>
          </FadeIn>

          <FadeIn index={2} style={{ marginBottom: 32 }}>
            <TrustStats stats={TRUST_STATS} variant="inline" />
          </FadeIn>

          <View style={{ flex: 1 }} />

          {/* Same size pills: navy Get Started, outlined Log in (both navy-filled would look identical). */}
          <FadeIn index={3} style={{ gap: 12 }}>
            <AnimatedButton label="Get Started" onPress={() => navigation.navigate("NewUserSignUp")} />
            <AnimatedButton label="Log in" variant="secondary" onPress={() => navigation.navigate("Login")} />
          </FadeIn>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
