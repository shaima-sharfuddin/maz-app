import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import TrustStats from "../components/TrustStats";
import BackButton from "../components/BackButton";
import ServiceCard from "../components/ServiceCard";
import EmptyState from "../components/EmptyState";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import { fetchPlans, errorMessage } from "../services/api";
import { TRUST_STATS } from "../data/brand";
import { useTheme } from "../theme/ThemeContext";
import { TYPE } from "../theme/theme";
import FadeIn from "../components/FadeIn";
import PhotoHero from "../components/PhotoHero";

function ServiceCardSkeleton() {
  return (
    <SkeletonCard style={{ marginBottom: 16, padding: 16, flexDirection: "row", alignItems: "center" }}>
      <Skeleton width={44} height={44} radius={12} style={{ marginRight: 14 }} />
      <View style={{ flex: 1 }}>
        <Skeleton width="50%" height={16} style={{ marginBottom: 8 }} />
        <Skeleton width="85%" height={12} />
      </View>
    </SkeletonCard>
  );
}

// The services a customer can request (fetchPlans: Office Suites, Meeting Rooms, CR Registration).
// Each opens Term & payments (SelectTerm) directly — or, for Meeting Rooms, the hourly booking.
export default function BrowsePlansScreen({ navigation }) {
  const { colors } = useTheme();
  const { loading, data: plans, error, reload } = useAsync(fetchPlans);

  const openService = (plan) =>
    plan.hourly ? navigation.navigate("MeetingRooms") : navigation.navigate("SelectTerm", { plan });

  const renderPlans = () => {
    if (loading) {
      return [0, 1, 2].map((key) => <ServiceCardSkeleton key={key} />);
    }
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load our services"
          message={errorMessage(error)}
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }
    if (plans.length === 0) {
      return (
        <EmptyState
          icon="briefcase-outline"
          title="No services available right now"
          message="Our team is preparing new offerings. Please check back shortly."
        />
      );
    }
    return plans.map((plan, index) => (
      <FadeIn key={plan.id} index={index + 1}>
        <ServiceCard plan={plan} onPress={() => openService(plan)} />
      </FadeIn>
    ));
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Banner: the screen's existing eyebrow, title and subtitle over an office-suite photo. */}
        <PhotoHero
          photo="plans"
          overlay="navy"
          minHeight={320}
          contentStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28, justifyContent: "space-between" }}
        >
          <BackButton onHero onPress={() => navigation.goBack()} />
          <FadeIn style={{ paddingTop: 72 }}>
            <Text style={[TYPE.overline, { color: colors.onHeroMuted, marginBottom: 10 }]}>MAZ Business Center</Text>
            <Text accessibilityRole="header" style={[TYPE.screenTitle, { color: colors.onHero, marginBottom: 8, maxWidth: 300 }]}>
              What are you looking for?
            </Text>
            <Text style={{ color: colors.onHeroMuted, fontSize: 15, lineHeight: 22, maxWidth: 320 }}>
              Prestigious workspaces and seamless business services, tailored to how you work.
            </Text>
          </FadeIn>
        </PhotoHero>

        <View className="flex-1 px-6 pt-8 pb-10">
          {renderPlans()}

          <FadeIn index={4} style={{ marginTop: 16 }}>
            <TrustStats stats={TRUST_STATS} variant="inline" />
          </FadeIn>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
