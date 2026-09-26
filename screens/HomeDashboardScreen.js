import { useCallback } from "react";
import { View, Text, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AnimatedButton from "../components/AnimatedButton";
import TrustStats from "../components/TrustStats";
import ScreenTitle from "../components/ScreenTitle";
import EmptyState from "../components/EmptyState";
import PressableScale from "../components/PressableScale";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import { fetchDashboard } from "../services/api";
import { TRUST_STATS, BAHRAIN_ADVANTAGES, SERVICES } from "../data/brand";
import { formatBHD } from "../data/pricing";
import { formatDate, formatMonth } from "../utils/formatDate";
import { useTheme } from "../theme/ThemeContext";
import { useDemo } from "../demo/DemoContext";

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

function TenantSkeleton() {
  return (
    <View>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
        <SkeletonCard style={{ flex: 1, padding: 16 }}>
          <Skeleton width="70%" height={12} style={{ marginBottom: 10 }} />
          <Skeleton width={32} height={24} />
        </SkeletonCard>
        <SkeletonCard style={{ flex: 1, padding: 16 }}>
          <Skeleton width="70%" height={12} style={{ marginBottom: 10 }} />
          <Skeleton width={32} height={24} />
        </SkeletonCard>
      </View>
      <SkeletonCard style={{ padding: 16, marginBottom: 32 }}>
        <Skeleton width="40%" height={12} style={{ marginBottom: 10 }} />
        <Skeleton width="55%" height={24} />
      </SkeletonCard>
      {[0, 1, 2].map((key) => (
        <SkeletonCard key={key} style={{ padding: 16, marginBottom: 10 }}>
          <Skeleton width="60%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="85%" height={12} />
        </SkeletonCard>
      ))}
    </View>
  );
}

function contractCaption(contract) {
  if (contract.status === "expired") return `Contract ${contract.id} · Ended ${formatDate(contract.endDate)}`;
  if (contract.outstanding > 0) return `Contract ${contract.id} · ${formatBHD(contract.outstanding)} due`;
  return `Contract ${contract.id} · Paid through ${formatMonth(contract.paidThrough)}`;
}

function ContractRow({ contract, onPress }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${contract.unit}, ${contract.location}, ${contract.status}`}
      containerStyle={{ marginBottom: 10 }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderRadius: 16,
        padding: 16,
      }}
    >
      <View style={{ flex: 1, marginRight: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
            {contract.unit} · {contract.location}
          </Text>
          <StatusBadge status={contract.status} />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>{contractCaption(contract)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </PressableScale>
  );
}

export default function HomeDashboardScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { userState } = useDemo();
  const ownerName = route.params?.ownerName;
  const profileSaved = route.params?.profileSaved;

  // Re-fetches when the Settings demo toggle changes (tenant ↔ new user).
  const loadDashboard = useCallback(() => fetchDashboard(userState), [userState]);
  const { loading, data, error, reload } = useAsync(loadDashboard);

  const isTenant = userState === "tenant";

  const cardStyle = {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 16,
  };

  const errorState = (
    <EmptyState
      icon="cloud-offline-outline"
      title="We couldn't load your dashboard"
      message="Please check your connection and try again."
    >
      <AnimatedButton label="Try again" onPress={reload} />
    </EmptyState>
  );

  const renderTenant = () => {
    if (loading) return <TenantSkeleton />;
    if (error || !data?.summary) return errorState;
    const { summary, contracts } = data;

    return (
      <View>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
          <StatCard
            style={{ flex: 1 }}
            label="Active contracts"
            value={summary.activeCount}
            caption={`${summary.activeOffices} office · ${summary.activeIncubators} incubator`}
          />
          <StatCard
            style={{ flex: 1 }}
            label="Expired contracts"
            value={summary.expiredCount}
            caption={summary.latestExpiry ? `Latest expiry: ${formatDate(summary.latestExpiry)}` : undefined}
          />
        </View>
        <StatCard
          style={{ marginBottom: 32 }}
          label="Payment due"
          value={formatBHD(summary.paymentDue)}
          caption={summary.nextDueDate ? `Due by ${formatDate(summary.nextDueDate)}` : "Nothing due"}
        />

        <SectionHeading>Your contracts</SectionHeading>
        {contracts.length === 0 ? (
          <EmptyState icon="document-text-outline" title="No contracts yet" message="Your contracts will appear here." />
        ) : (
          contracts.map((contract) => (
            <ContractRow
              key={contract.id}
              contract={contract}
              onPress={() => navigation.navigate("ContractDetail", { contractId: contract.id })}
            />
          ))
        )}

        <View style={{ marginTop: 22 }}>
          <AnimatedButton label="Find a new office" onPress={() => navigation.navigate("BrowsePlans")} />
        </View>
      </View>
    );
  };

  const renderNewUser = () => (
    <View>
      <View className="mb-8">
        {loading ? (
          <LeaseSkeleton />
        ) : error ? (
          errorState
        ) : (
          <EmptyState
            icon="business-outline"
            title={"You haven't leased an office yet"}
            message="Explore fully serviced office suites with seamless setup and concierge-level support."
          >
            <AnimatedButton label="Browse Plans" onPress={() => navigation.navigate("BrowsePlans")} />
          </EmptyState>
        )}
      </View>

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
  );

  const name = ownerName || (isTenant ? data?.tenantName : undefined);

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
            title={isTenant ? `Welcome back${name ? `, ${name}` : ""}` : name ? `Welcome, ${name}` : "Welcome"}
            subtitle={
              isTenant
                ? "Here's an overview of your contracts and payments."
                : "Your prestigious business address in Bahrain begins here."
            }
          />

          {isTenant ? renderTenant() : renderNewUser()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
