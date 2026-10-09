import { useCallback, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import EmptyState from "../components/EmptyState";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import ErrorBanner from "../components/ErrorBanner";
import useAsync from "../hooks/useAsync";
import useSubmit from "../hooks/useSubmit";
import { fetchContract, payOutstandingBalance, fetchRequestInvoice, payRequestInvoice, errorMessage } from "../services/api";
import { PAYMENT_METHODS } from "../data/paymentMethods";
import { formatBHD } from "../data/pricing";
import { formatDate, formatMonth } from "../utils/formatDate";
import { unitWithLocation } from "../utils/formatUnit";
import SectionHeading from "../components/SectionHeading";
import PaymentMethodOption from "../components/PaymentMethodOption";
import DetailCard from "../components/DetailCard";
import { useTheme } from "../theme/ThemeContext";

function PaymentSkeleton() {
  return (
    <View>
      <SkeletonCard style={{ alignItems: "center", marginBottom: 16 }}>
        <Skeleton width="35%" height={12} style={{ marginBottom: 10 }} />
        <Skeleton width="55%" height={30} style={{ marginBottom: 8 }} />
        <Skeleton width="45%" height={12} />
      </SkeletonCard>
      {[0, 1].map((key) => (
        <SkeletonCard key={key} style={{ marginBottom: 10, padding: 16 }}>
          <Skeleton width="50%" height={14} style={{ marginBottom: 8 }} />
          <Skeleton width="75%" height={12} />
        </SkeletonCard>
      ))}
    </View>
  );
}

// ⚠️ MOCK PAYMENT — no gateway is connected and nothing is charged (see CLAUDE.md → Open questions).
// Pays either a contract's outstanding balance ({ contractId }) or a new office request's invoice
// ({ requestId }, from RequestStatus at "Invoice Generated"). Both loaders return the same shape.
export default function PaymentScreen({ navigation, route }) {
  const { colors } = useTheme();
  const contractId = route.params?.contractId;
  const requestId = route.params?.requestId;
  const isInvoice = Boolean(requestId);
  const loadPayable = useCallback(
    () => (requestId ? fetchRequestInvoice(requestId) : fetchContract(contractId)),
    [requestId, contractId]
  );
  const { loading, data: contract, error, reload } = useAsync(loadPayable);

  const [methodId, setMethodId] = useState(PAYMENT_METHODS[0].id);
  const pay = useSubmit(isInvoice ? payRequestInvoice : payOutstandingBalance);

  const handlePay = async () => {
    const receipt = await pay.submit(isInvoice ? requestId : contractId, methodId);
    if (!receipt) return; // error is shown by the ErrorBanner below
    // Fresh stack so the screen underneath re-loads with the payment, and Back from the Payment Successful
    // screen can't return to this (now paid) screen. The dashboard stays at the root of the stack.
    navigation.reset({
      index: 2,
      routes: [
        { name: "HomeDashboard" },
        isInvoice
          ? { name: "RequestStatus", params: { requestId } }
          : { name: "ContractDetail", params: { contractId } },
        { name: "PaymentReceipt", params: { receipt } },
      ],
    });
  };

  const renderContent = () => {
    if (loading) return <PaymentSkeleton />;
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load this payment"
          message={errorMessage(error)}
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }
    if (contract.outstanding <= 0) {
      return (
        <EmptyState
          icon="checkmark-circle-outline"
          title="Nothing to pay"
          message={isInvoice ? "This invoice is already paid." : "This contract has no outstanding balance."}
        >
          <AnimatedButton
            label={isInvoice ? "Back to request" : "Back to contract"}
            variant="ghost"
            onPress={() => navigation.goBack()}
          />
        </EmptyState>
      );
    }

    const dueBills = contract.bills.filter((bill) => bill.status === "due");

    return (
      <View>
        <View
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            borderRadius: 16,
            padding: 20,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Amount due</Text>
          <Text style={{ color: colors.text, fontSize: 32, lineHeight: 36, fontWeight: "800", letterSpacing: -0.5, marginVertical: 6 }}>
            {formatBHD(contract.outstanding)}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center" }}>
            {unitWithLocation(contract.unit, contract.location)}
            {contract.dueDate ? `\nDue by ${formatDate(contract.dueDate)}` : ""}
          </Text>
        </View>

        {isInvoice ? (
          // What this payment is for, so the amount is never out of context.
          <DetailCard
            title="You're paying for"
            rows={[
              contract.invoiceNumber ? { label: "Invoice", value: contract.invoiceNumber } : null,
              contract.description ? { label: "Service", value: contract.description } : null,
              contract.paymentFrequency ? { label: "Payment frequency", value: contract.paymentFrequency } : null,
            ].filter(Boolean)}
          />
        ) : null}

        <View
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            borderRadius: 16,
            paddingHorizontal: 20,
            paddingVertical: 6,
            marginBottom: 32,
          }}
        >
          {dueBills.map((bill, index) => (
            <View
              key={bill.number}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 12,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.surfaceBorder,
              }}
            >
              <View>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>{bill.number}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  {bill.periodLabel ?? formatMonth(bill.month)}
                </Text>
              </View>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500" }}>{formatBHD(bill.amount)}</Text>
            </View>
          ))}
        </View>

        <SectionHeading>Payment method</SectionHeading>
        {PAYMENT_METHODS.map((method) => (
          <PaymentMethodOption
            key={method.id}
            method={method}
            selected={method.id === methodId}
            onSelect={() => setMethodId(method.id)}
          />
        ))}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, marginBottom: 32 }}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSubtle} />
          <Text style={{ flex: 1, color: colors.textSubtle, fontSize: 12, lineHeight: 16 }}>
            Demo payment — no money is charged. The real payment gateway is still to be confirmed.
          </Text>
        </View>

        <AnimatedButton
          label={pay.loading ? "Processing payment…" : `Pay ${formatBHD(contract.outstanding)}`}
          onPress={handlePay}
          loading={pay.loading}
        />
        <ErrorBanner message={pay.error} onRetry={handlePay} />
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />
          <ScreenTitle
            eyebrow={isInvoice ? `Request ${requestId}` : contractId ? `Contract ${contractId}` : undefined}
            title={isInvoice ? "Pay your invoice" : "Pay outstanding balance"}
            subtitle="Review the amount and choose how you'd like to pay."
          />
          {renderContent()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
