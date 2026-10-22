import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PhotoCarousel from "./PhotoCarousel";
import PressableScale from "./PressableScale";
import { Skeleton } from "./Skeleton";
import { planPhotos } from "../theme/imagery";
import { formatBHD, PLACEHOLDER_MONTHLY_RATE_BHD } from "../data/pricing";
import { useTheme } from "../theme/ThemeContext";
import { BRAND, ELEVATION, MOTION, RADIUS, TYPE } from "../theme/theme";

// Airbnb-style listing card for a MAZ service (Visual system v2): swipeable photos on top, then the title, tagline and
// the monthly price — text sits BELOW the photo, never on it (only the decorative service-icon chip sits on it). The
// price is the app's SAMPLE rate (data/pricing.js) and says so. Photos are stock (theme/imagery.js PLAN_PHOTOS) —
// never MAZ's own. aspectRatio frames the photos: 4:3 (user, 2026-10-22 — shorter than the earlier near-square 20:19,
// same width).
export const LISTING_ASPECT = 4 / 3;

export default function PlanCard({ plan, onPress, aspectRatio = LISTING_ASPECT, style }) {
  const { colors, elevation } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={MOTION.cardPressScale}
      accessibilityRole="button"
      accessibilityLabel={`${plan.title}. ${plan.tagline ?? plan.description}. From ${formatBHD(PLACEHOLDER_MONTHLY_RATE_BHD)} a month, sample price.`}
      containerStyle={[{ marginBottom: 28 }, style]}
    >
      {/* Soft lift under the photo (light mode only — elevation.card is empty in dark mode). */}
      <View style={[{ borderRadius: RADIUS.photo, backgroundColor: colors.surface }, elevation.card]}>
        <PhotoCarousel photos={planPhotos(plan)} aspectRatio={aspectRatio} />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: "#ffffff",
            alignItems: "center",
            justifyContent: "center",
            ...ELEVATION.light.card,
          }}
        >
          <Ionicons name={plan.icon ?? "business-outline"} size={18} color={BRAND.navy} />
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14 }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={[TYPE.listingTitle, { color: colors.text }]}>{plan.title}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} style={{ marginRight: 3 }} />
            <Text style={[TYPE.caption, { color: colors.textMuted, flex: 1 }]} numberOfLines={1}>
              Bahrain · {plan.tagline ?? plan.description}
            </Text>
          </View>
        </View>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primarySoft,
          }}
        >
          <Ionicons name="arrow-forward" size={16} color={colors.primary} />
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
        <Text style={[TYPE.body, { color: colors.text }]}>
          <Text style={{ fontWeight: "700" }}>{formatBHD(PLACEHOLDER_MONTHLY_RATE_BHD)}</Text>
          <Text style={{ color: colors.textMuted }}> / month</Text>
        </Text>
        <View
          style={{
            marginLeft: 8,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: RADIUS.pill,
            backgroundColor: colors.surfaceMuted,
          }}
        >
          <Text style={[TYPE.caption, { color: colors.textMuted, fontSize: 11 }]}>Sample</Text>
        </View>
      </View>
    </PressableScale>
  );
}

// Loading placeholder in PlanCard's shape (photo, title, tagline, price).
export function PlanCardSkeleton({ aspectRatio = LISTING_ASPECT }) {
  return (
    <View style={{ marginBottom: 28 }}>
      <View style={{ aspectRatio }}>
        <Skeleton width="100%" height="100%" radius={RADIUS.photo} />
      </View>
      <Skeleton width="45%" height={16} style={{ marginTop: 14 }} />
      <Skeleton width="70%" height={12} style={{ marginTop: 8 }} />
      <Skeleton width="35%" height={12} style={{ marginTop: 8 }} />
    </View>
  );
}
