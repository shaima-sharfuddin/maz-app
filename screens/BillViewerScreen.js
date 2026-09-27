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
import { fetchBill } from "../services/api";
import { formatBHD } from "../data/pricing";
import { formatDate, formatMonth } from "../utils/formatDate";
import { useTheme } from "../theme/ThemeContext";

// "View bill" from the recruiter wireframe, opened from ContractDetail with { contractId, billNumber }.
// PLACEHOLDER layout: an in-app summary until MAZ confirms the real invoice format (PDF? VAT breakdown?).
export default function BillViewerScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { contractId, billNumber } = route.params ?? {};
  const loadBill = useCallback(() => fetchBill(contractId, billNumber), [contractId, billNumber]);
  const { loading, data: bill, error, reload } = useAsync(loadBill);

  const renderContent = () => {
    if (loading) {
      return (
        <View>
          <Skeleton width="25%" height={12} style={{ marginBottom: 10 }} />
          <Skeleton width="60%" height={26} style={{ marginBottom: 32 }} />
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
          title="We couldn't load this bill"
          message="Please check your connection and try again."
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }

    return (
      <View>
        <ScreenTitle
          eyebrow={`Bill · ${formatMonth(bill.periodStart)}`}
          title={bill.number}
          subtitle={`${bill.unit} · ${bill.location}`}
        />
        <View style={{ marginTop: -20, marginBottom: 28 }}>
          <StatusBadge status={bill.status} />
        </View>

        <DetailCard
          title="Details"
          rows={[
            { label: "Contract", value: bill.contractId },
            { label: "Billing period", value: `${formatDate(bill.periodStart)} – ${formatDate(bill.periodEnd)}` },
            ...(bill.dueDate ? [{ label: "Due date", value: formatDate(bill.dueDate) }] : []),
          ]}
        />

        <DetailCard
          title="Charges"
          rows={[
            ...bill.lineItems.map((item) => ({ label: item.label, value: formatBHD(item.amount) })),
            { label: "Total", value: formatBHD(bill.total), emphasize: true },
          ]}
        />

        {bill.payment ? (
          <DetailCard
            title="Payment"
            rows={[
              { label: "Paid on", value: formatDate(bill.payment.paidOn) },
              { label: "Method", value: bill.payment.method },
              { label: "Receipt", value: bill.payment.receipt },
            ]}
          />
        ) : null}

        {bill.status === "due" ? (
          <View style={{ marginTop: 6 }}>
            <AnimatedButton
              label="Pay outstanding balance"
              onPress={() => navigation.navigate("Payment", { contractId: bill.contractId })}
            />
          </View>
        ) : null}

        <Text className="text-xs leading-5 text-center mt-4" style={{ color: colors.textSubtle }}>
          Bill summary — your official invoice is issued by MAZ Business Center.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />
          {renderContent()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
