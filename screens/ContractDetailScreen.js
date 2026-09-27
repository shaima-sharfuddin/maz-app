import { useCallback } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import StatusBadge from "../components/StatusBadge";
import DetailCard from "../components/DetailCard";
import EmptyState from "../components/EmptyState";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import { fetchContract } from "../services/api";
import { formatBHD, formatTerm } from "../data/pricing";
import { formatDate, formatMonth } from "../utils/formatDate";
import { useTheme } from "../theme/ThemeContext";

function DetailSkeleton() {
  return (
    <View>
      <Skeleton width="30%" height={12} style={{ marginBottom: 10 }} />
      <Skeleton width="65%" height={26} style={{ marginBottom: 10 }} />
      <Skeleton width="50%" height={14} style={{ marginBottom: 32 }} />
      {[0, 1, 2].map((key) => (
        <SkeletonCard key={key} style={{ marginBottom: 16 }}>
          <Skeleton width="40%" height={16} style={{ marginBottom: 14 }} />
          <Skeleton width="90%" height={12} style={{ marginBottom: 8 }} />
          <Skeleton width="70%" height={12} />
        </SkeletonCard>
      ))}
    </View>
  );
}

// Same layout for active and expired contracts; only the status and bill/payment data change.
export default function ContractDetailScreen({ navigation, route }) {
  const { colors } = useTheme();
  const contractId = route.params?.contractId;
  const renewalRequested = route.params?.renewalRequested; // set by RenewContract after a successful request
  const loadContract = useCallback(() => fetchContract(contractId), [contractId]);
  const { loading, data: contract, error, reload } = useAsync(loadContract);

  const renderContent = () => {
    if (loading) return <DetailSkeleton />;
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load this contract"
          message="Please check your connection and try again."
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }

    const hasDues = contract.outstanding > 0;
    const dueBills = contract.bills.filter((bill) => bill.status === "due");
    const canRenew = contract.status === "active" && !contract.renewal;
    const renewButton = canRenew ? (
      <View style={{ marginTop: hasDues ? 4 : 16 }}>
        <AnimatedButton
          label="Renew contract"
          variant={hasDues ? "ghost" : "primary"}
          onPress={() => navigation.navigate("RenewContract", { contractId: contract.id })}
        />
      </View>
    ) : null;

    const termRows = [
      ...(contract.startDate ? [{ label: "Start date", value: formatDate(contract.startDate) }] : []),
      ...(contract.endDate
        ? [{ label: contract.status === "expired" ? "Ended" : "End date", value: formatDate(contract.endDate) }]
        : []),
      ...(contract.renewal
        ? [
            { label: "Renewal", value: <StatusBadge status={contract.renewal.status} /> },
            { label: "Renewal term", value: formatTerm(contract.renewal.termMonths) },
            { label: "Proposed end date", value: formatDate(contract.renewal.newEndDate) },
            { label: "Requested", value: formatDate(contract.renewal.requestedOn) },
          ]
        : []),
    ];

    return (
      <View>
        <ScreenTitle eyebrow="Contract" title={contract.id} subtitle={`${contract.unit} · ${contract.location}`} />
        <View style={{ marginTop: -20, marginBottom: 28, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <StatusBadge status={contract.status} />
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            {contract.status === "expired"
              ? `Ended ${formatDate(contract.endDate)}`
              : contract.paidThrough
                ? `Paid through ${formatMonth(contract.paidThrough)}`
                : null}
          </Text>
        </View>

        {renewalRequested && contract.renewal ? (
          <Text className="text-sm mb-4" style={{ color: colors.success }}>
            {"✓"} Renewal requested — we'll confirm the new terms by email.
          </Text>
        ) : null}

        {termRows.length > 0 ? <DetailCard title="Contract term" rows={termRows} /> : null}

        {contract.bill ? (
          <DetailCard
            title="Bill details"
            rows={[
              { label: "Bill no.", value: contract.bill.number },
              {
                label: "Billing period",
                value: `${formatDate(contract.bill.periodStart)} – ${formatDate(contract.bill.periodEnd)}`,
              },
            ]}
          />
        ) : null}

        {contract.payment ? (
          <DetailCard
            title="Payment details"
            rows={[
              { label: "Payment method", value: contract.payment.method },
              {
                label: "Last payment",
                value: `${formatBHD(contract.payment.lastAmount)} on ${formatDate(contract.payment.lastDate)}`,
              },
              { label: "Receipt", value: contract.payment.receipt },
            ]}
          />
        ) : null}

        {hasDues ? (
          <>
            <DetailCard
              title="Payment due"
              rows={[
                { label: "Outstanding balance", value: formatBHD(contract.outstanding), emphasize: true },
                { label: "Due date", value: formatDate(contract.dueDate) },
                { label: "Due bills", value: String(dueBills.length) },
              ]}
            />

            <Text
              className="text-xs font-semibold uppercase tracking-widest mb-3 mt-4"
              style={{ color: colors.accent }}
            >
              Bills
            </Text>
            {contract.bills.map((bill) => (
              <View
                key={bill.number}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.surfaceBorder,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                }}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600", marginBottom: 4 }}>
                    {bill.number}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                    {formatMonth(bill.month)} · {formatBHD(bill.amount)} · Due {formatDate(bill.dueDate)}
                  </Text>
                </View>
                <StatusBadge status={bill.status} />
              </View>
            ))}

            <View style={{ marginTop: 22 }}>
              <AnimatedButton
                label="Pay outstanding balance"
                onPress={() => navigation.navigate("Payment", { contractId: contract.id })}
              />
            </View>
            {renewButton}
          </>
        ) : (
          <>
            <EmptyState
              icon="checkmark-circle-outline"
              title="No outstanding balance"
              message={
                contract.status === "expired"
                  ? "This contract has ended and is fully settled."
                  : "You're all paid up on this contract."
              }
            />
            {renewButton}
          </>
        )}
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
