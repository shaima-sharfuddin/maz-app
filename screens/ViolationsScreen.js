import { useCallback } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import EmptyState from "../components/EmptyState";
import PressableScale from "../components/PressableScale";
import StatusBadge from "../components/StatusBadge";
import SectionHeading from "../components/SectionHeading";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import { fetchViolations, VIOLATIONS_ARE_DEMO, errorMessage } from "../services/api";
import { formatDate } from "../utils/formatDate";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";
import { useAccountState } from "../auth/AuthContext";

// Entry to MAZ's REAL catalogue of violation types (ViolationTypesScreen) — kept apart from the notices above,
// which are demo data: it's a reference list, not the customer's violations.
function ViolationTypesLink({ onPress }) {
  const { colors } = useTheme();
  const card = useCardStyle();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel="Violation types. MAZ's reference list of violation categories"
      containerStyle={{ marginTop: 8 }}
      style={[card, { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 }]}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="list-outline" size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>Violation types</Text>
        <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 2 }}>
          MAZ&apos;s reference list of violation categories
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </PressableScale>
  );
}

function ViolationRow({ violation, onPress }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={[
        violation.title,
        violation.status,
        violation.demo ? "demo data" : null,
        violation.status === "open" && violation.dueDate ? `due ${formatDate(violation.dueDate)}` : null,
      ]
        .filter(Boolean)
        .join(", ")}
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
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{violation.title}</Text>
          <StatusBadge status={violation.status} />
          {violation.demo ? <StatusBadge status="demo" /> : null}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>
          {[violation.unit ?? violation.contractId, `Issued ${formatDate(violation.issuedOn)}`].filter(Boolean).join(" · ")}
        </Text>
        {violation.status === "open" && violation.dueDate ? (
          <Text style={{ color: colors.danger, fontSize: 13, lineHeight: 18, marginTop: 2 }}>
            Due {formatDate(violation.dueDate)}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </PressableScale>
  );
}

export default function ViolationsScreen({ navigation }) {
  const { colors } = useTheme();
  const userState = useAccountState(); // from the session's customerId — never a separate demo setting
  const loadViolations = useCallback(() => fetchViolations(userState), [userState]);
  const { loading, data: violations, error, reload } = useAsync(loadViolations);

  const section = (title, items) =>
    items.length > 0 ? (
      <View className="mb-8">
        <SectionHeading>{title}</SectionHeading>
        {items.map((violation) => (
          <ViolationRow
            key={violation.id}
            violation={violation}
            onPress={() => navigation.navigate("ViolationDetail", { violationId: violation.id })}
          />
        ))}
      </View>
    ) : null;

  const renderContent = () => {
    if (loading) {
      return [0, 1, 2].map((key) => (
        <SkeletonCard key={key} style={{ padding: 16, marginBottom: 10 }}>
          <Skeleton width="60%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="45%" height={12} />
        </SkeletonCard>
      ));
    }
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load your notices"
          message={errorMessage(error)}
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }
    if (violations.length === 0) {
      return (
        <EmptyState
          icon="shield-checkmark-outline"
          title="No violations — you're all clear"
          message="Your account is in good standing."
        />
      );
    }
    const open = violations.filter((v) => v.status === "open");
    return (
      <View>
        {/* Demo records (services/violationService.js — MOCK): never presented as MAZ's. */}
        {VIOLATIONS_ARE_DEMO ? (
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSubtle} />
            <Text style={{ flex: 1, color: colors.textSubtle, fontSize: 12, lineHeight: 16 }}>
              Demo data — sample notices to show how violations will work. MAZ&apos;s violation records aren&apos;t connected yet.
            </Text>
          </View>
        ) : null}
        {open.length === 0 ? (
          <Text className="text-sm mb-6" style={{ color: colors.success }}>
            {"✓"} No open notices — your account is in good standing.
          </Text>
        ) : null}
        {section("Open", open)}
        {section("Resolved", violations.filter((v) => v.status !== "open"))}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />
          <ScreenTitle
            title="Violations & compliance"
            subtitle="Notices issued on your contracts, and how each was resolved."
          />
          {renderContent()}
          <SectionHeading style={{ marginTop: 24 }}>Reference</SectionHeading>
          <ViolationTypesLink onPress={() => navigation.navigate("ViolationTypes")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
