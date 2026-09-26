import { View, Text, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AnimatedButton from "../components/AnimatedButton";
import TrustStats from "../components/TrustStats";
import ScreenTitle from "../components/ScreenTitle";
import EmptyState from "../components/EmptyState";
import PressableScale from "../components/PressableScale";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import { fetchDashboard } from "../api/mockApi";
import { TRUST_STATS, BAHRAIN_ADVANTAGES, SERVICES } from "../data/brand";
import { useTheme } from "../theme/ThemeContext";

function SectionHeading({ children }) {
  const { colors } = useTheme();
  return (
    <Text className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: colors.accent }}>
      {children}
    </Text>
  );
}

function LeaseSkeleton() {
  return (
    <SkeletonCard style={{ alignItems: "center", padding: 24 }}>
      <Skeleton width={56} height={56} radius={28} style={{ marginBottom: 16 }} />
      <Skeleton width="60%" height={18} style={{ marginBottom: 10 }} />
      <Skeleton width="85%" height={12} style={{ marginBottom: 6 }} />
      <Skeleton width="70%" height={12} style={{ marginBottom: 20 }} />
      <Skeleton height={52} radius={12} />
    </SkeletonCard>
  );
}

// New-user state only — the active-tenant state (contract status, quick actions) comes with the backend.
export default function HomeDashboardScreen({ navigation, route }) {
  const { colors } = useTheme();
  const ownerName = route.params?.ownerName;
  const profileSaved = route.params?.profileSaved;
  const { loading, data, error, reload } = useAsync(fetchDashboard);

  const cardStyle = {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 16,
  };

  const renderLease = () => {
    if (loading) return <LeaseSkeleton />;
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load your dashboard"
          message="Please check your connection and try again."
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }
    if (!data.lease) {
      return (
        <EmptyState
          icon="business-outline"
          title={"You haven't leased an office yet"}
          message="Explore fully serviced office suites with seamless setup and concierge-level support."
        >
          <AnimatedButton label="Browse Plans" onPress={() => navigation.navigate("BrowsePlans")} />
        </EmptyState>
      );
    }
    // TODO: active-tenant lease card once the API returns a lease.
    return null;
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <Image
              source={require("../assets/images/maz-logo-wordmark.png")}
              style={{ width: 120, height: 30 }}
              resizeMode="contain"
            />
            <PressableScale
              onPress={() => navigation.navigate("Settings")}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
            </PressableScale>
          </View>

          {profileSaved ? (
            <Text className="text-sm mb-4" style={{ color: colors.success }}>
              {"✓"} Profile saved
            </Text>
          ) : null}

          <ScreenTitle
            eyebrow="MAZ Business Center"
            title={ownerName ? `Welcome, ${ownerName}` : "Welcome"}
            subtitle="Your prestigious business address in Bahrain begins here."
          />

          <View className="mb-8">{renderLease()}</View>

          <SectionHeading>Why MAZ</SectionHeading>
          <TrustStats stats={TRUST_STATS} />
          <View style={[cardStyle, { flexDirection: "row", marginTop: 10, marginBottom: 32 }]}>
            {BAHRAIN_ADVANTAGES.map((item, index) => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 14,
                  borderLeftWidth: index > 0 ? 1 : 0,
                  borderLeftColor: colors.surfaceBorder,
                }}
              >
                <Text className="text-lg font-bold" style={{ color: colors.primary }}>
                  {item.value}
                </Text>
                <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>

          <SectionHeading>What we offer</SectionHeading>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
            {SERVICES.map((service) => (
              <View key={service.id} style={[cardStyle, { flexBasis: "47%", flexGrow: 1, padding: 16 }]}>
                <Text className="text-base font-semibold mb-1" style={{ color: colors.text }}>
                  {service.title}
                </Text>
                <Text className="text-xs leading-5" style={{ color: colors.textMuted }}>
                  {service.description}
                </Text>
              </View>
            ))}
          </View>

          <SectionHeading>What our clients say</SectionHeading>
          {/* PLACEHOLDER — real testimonials need MAZ's permission before they can be used here. */}
          <EmptyState
            dashed
            icon="chatbubbles-outline"
            title="Client stories coming soon"
            message="Hear from the founders and directors who call MAZ home."
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
