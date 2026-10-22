import { useCallback } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import DetailCard from "../components/DetailCard";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import { fetchViolation, VIOLATIONS_ARE_DEMO, errorMessage } from "../services/api";
import { Ionicons } from "@expo/vector-icons";
import { formatBHD } from "../data/pricing";
import { formatDate } from "../utils/formatDate";
import { useTheme } from "../theme/ThemeContext";

function TextCard({ title, caption, body }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: caption ? 4 : 10 }}>{title}</Text>
      {caption ? <Text style={{ color: colors.textSubtle, fontSize: 12, marginBottom: 12 }}>{caption}</Text> : null}
      <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 21 }}>{body}</Text>
    </View>
  );
}

// Read-only notice. Questions or disputes go through a pre-filled support enquiry.
export default function ViolationDetailScreen({ navigation, route }) {
  const { colors } = useTheme();
  const violationId = route.params?.violationId;
  const loadViolation = useCallback(() => fetchViolation(violationId), [violationId]);
  const { loading, data: violation, error, reload } = useAsync(loadViolation);

  const renderContent = () => {
    if (loading) {
      return (
        <View>
          <Skeleton width="30%" height={12} style={{ marginBottom: 10 }} />
          <Skeleton width="70%" height={26} style={{ marginBottom: 32 }} />
          {[0, 1].map((key) => (
            <SkeletonCard key={key} style={{ marginBottom: 16 }}>
              <Skeleton width="40%" height={16} style={{ marginBottom: 14 }} />
              <Skeleton width="90%" height={12} style={{ marginBottom: 8 }} />
              <Skeleton width="70%" height={12} />
            </SkeletonCard>
          ))}
        </View>
      );
    }
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load this notice"
          message={errorMessage(error)}
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }

    const rows = [
      { label: "Status", value: <StatusBadge status={violation.status} /> },
      ...(violation.demo ? [{ label: "Source", value: <StatusBadge status="demo" /> }] : []),
      { label: "Contract", value: violation.contractId ?? "Not linked (demo record)" },
      ...(violation.unit ? [{ label: "Unit", value: [violation.unit, violation.location].filter(Boolean).join(" · ") }] : []),
      ...(violation.category ? [{ label: "Category", value: violation.category }] : []),
      { label: "Issued", value: formatDate(violation.issuedOn) },
      ...(violation.status === "open" && violation.dueDate
        ? [{ label: "Due date", value: formatDate(violation.dueDate), emphasize: true }]
        : []),
      ...(violation.fine ? [{ label: "Fine", value: formatBHD(violation.fine), emphasize: true }] : []),
    ];

    return (
      <View>
        <ScreenTitle eyebrow={`Notice ${violation.id}`} title={violation.title} />

        <DetailCard rows={rows}>
          {violation.fine ? (
            <Text style={{ color: colors.textSubtle, fontSize: 12, lineHeight: 16, paddingBottom: 12 }}>
              Fines are added to your contract balance and settled with your bill.
            </Text>
          ) : null}
        </DetailCard>

        {/* Demo record (services/violationService.js — MOCK). */}
        {VIOLATIONS_ARE_DEMO && violation.demo ? (
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSubtle} />
            <Text style={{ flex: 1, color: colors.textSubtle, fontSize: 12, lineHeight: 16 }}>
              Demo data — a sample notice, not a MAZ record.
            </Text>
          </View>
        ) : null}

        <TextCard title="Details" body={violation.description} />

        {violation.status === "resolved" && violation.resolution ? (
          <TextCard
            title="Resolution"
            caption={violation.resolvedOn ? `Resolved ${formatDate(violation.resolvedOn)}` : undefined}
            body={violation.resolution}
          />
        ) : null}

        <View style={{ marginTop: 16 }}>
          <AnimatedButton
            label="Contact support"
            onPress={() =>
              navigation.navigate("NewEnquiry", {
                prefill: {
                  category: "Violation query",
                  contractId: violation.contractId ?? null,
                  subject: `${violation.id}: ${violation.title}`,
                },
              })
            }
          />
        </View>
        <Text className="text-sm leading-5 text-center mt-4" style={{ color: colors.textMuted }}>
          Questions about this notice, or believe it was issued in error? Our team will look into it.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.canvas }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />
          {renderContent()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
