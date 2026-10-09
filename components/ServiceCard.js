import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "./PressableScale";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";
import { RADIUS, TYPE } from "../theme/theme";

// One service (data/brand.js SERVICES / fetchPlans) as a tappable row: icon tile, name, short description,
// chevron. Used by the new-user dashboard ("What are you looking for?") and Browse Plans; both open
// SelectTerm (or MeetingRooms for hourly services). A plan without an icon (e.g. from a future API) gets a
// generic one.
export default function ServiceCard({ plan, onPress, style }) {
  const { colors } = useTheme();
  const card = useCardStyle();

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${plan.title}. ${plan.description}`}
      containerStyle={[{ marginBottom: 16 }, style]}
      style={{
        ...card,
        flexDirection: "row",
        alignItems: "center",
        padding: 18,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: RADIUS.md,
          backgroundColor: colors.hero,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
        }}
      >
        <Ionicons name={plan.icon ?? "briefcase-outline"} size={22} color={colors.onHero} />
      </View>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={[TYPE.cardTitle, { color: colors.text, marginBottom: 2 }]}>{plan.title}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>{plan.description}</Text>
        {plan.hourly ? (
          <Text style={{ color: colors.textSubtle, fontSize: 12, marginTop: 4 }}>Booked by the hour</Text>
        ) : null}
      </View>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.surfaceMuted,
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
      </View>
    </PressableScale>
  );
}
