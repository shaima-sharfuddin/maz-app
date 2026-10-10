import { useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import StatusBadge from "../components/StatusBadge";
import SectionHeading from "../components/SectionHeading";
import EmptyState from "../components/EmptyState";
import PressableScale from "../components/PressableScale";
import TextLink from "../components/TextLink";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import {
  fetchContract,
  contractAmounts,
  summarizePayments,
  payNowTarget,
  PAYMENT_STATUS_NOTE,
  PAYMENTS_ARE_DEMO,
  fetchRenewal,
  renewalEligibility,
  describeExpiry,
  getExpiryNote,
  getExpiryWarningDays,
  RENEWALS_ARE_DEMO,
  errorMessage,
} from "../services/api";
import { formatBHD, formatTerm } from "../data/pricing";
import { formatDate, formatMonth } from "../utils/formatDate";
import { unitWithLocation } from "../utils/formatUnit";
import { paymentBadge } from "../utils/billStatus";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";
import { RADIUS, TYPE } from "../theme/theme";
import FadeIn from "../components/FadeIn";
import PhotoHero from "../components/PhotoHero";
import DocumentSheet from "../components/DocumentSheet";
import AmountHero from "../components/AmountHero";
import InfoNote from "../components/InfoNote";

function DetailSkeleton() {
  return (
    <View>
      <SkeletonCard style={{ borderRadius: 20, padding: 24, marginBottom: 24 }}>
        <Skeleton width="30%" height={12} style={{ marginBottom: 12 }} />
        <Skeleton width="65%" height={28} style={{ marginBottom: 10 }} />
        <Skeleton width="50%" height={14} style={{ marginBottom: 18 }} />
        <Skeleton width="25%" height={20} radius={10} />
      </SkeletonCard>
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

// The contract's money rows — only MAZ fields with a clear meaning, plus totals CALCULATED from the installments
// (contractService.contractAmounts; MAZ's rent_total isn't shown — its meaning is unconfirmed). Empty → no card.
// Expiry alert from contract.expiry (contractService → expiryService: REAL end date, confirmed 10-day window).
// Shown ONLY while an active contract has 10 days or fewer left (including its end date) — never once it has expired.
function ExpiryAlert({ contract, canRenew, onRenew }) {
  const { colors } = useTheme();
  const { expiry } = contract;
  if (contract.status !== "active" || expiry?.state !== "expiring") return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: colors.warningSoft,
        borderWidth: 1,
        borderColor: colors.warningBorder,
        borderRadius: RADIUS.card,
        paddingHorizontal: 20,
        paddingVertical: 18,
        marginBottom: 16,
      }}
    >
      <View style={{ position: "absolute", left: 0, top: 18, bottom: 18, width: 3, borderRadius: 2, backgroundColor: colors.warning }} />
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.warningBorder,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons name="time-outline" size={16} color={colors.warning} />
        </View>
        <Text style={[TYPE.cardTitle, { flex: 1, color: colors.text }]}>
          {describeExpiry(expiry)} · {formatDate(expiry.endDate)}
        </Text>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: canRenew ? 14 : 0 }}>
        {canRenew ? "You can ask MAZ to renew this contract. " : ""}
        {getExpiryNote()}
      </Text>
      {canRenew ? <AnimatedButton label="Request renewal" onPress={onRenew} /> : null}
    </View>
  );
}

function amountRows(contract) {
  const amounts = contractAmounts(contract);
  const hasVat = (amounts.vatFromInstallments ?? 0) > 0;
  return [
    amounts.monthlyRate != null ? { label: "Monthly rent", value: formatBHD(amounts.monthlyRate) } : null,
    amounts.numberOfMonths != null ? { label: "Number of months", value: formatTerm(amounts.numberOfMonths) } : null,
    amounts.paymentFrequency ? { label: "Payment frequency", value: amounts.paymentFrequency } : null,
    amounts.deposit != null ? { label: "Deposit", value: formatBHD(amounts.deposit) } : null,
    amounts.rentFromInstallments != null
      ? { label: "Total rent (calculated)", value: formatBHD(amounts.rentFromInstallments), emphasize: !hasVat }
      : null,
    hasVat ? { label: "VAT (calculated)", value: formatBHD(amounts.vatFromInstallments) } : null,
    hasVat ? { label: "Total incl. VAT (calculated)", value: formatBHD(amounts.totalFromInstallments), emphasize: true } : null,
  ].filter(Boolean);
}

// Same layout for active and expired contracts; only the status and bill/payment data change.
// Real MAZ contracts come from services/contractService.js; bill paid / unpaid is PROVISIONAL (billService).
export default function ContractDetailScreen({ navigation, route }) {
  const { colors } = useTheme();
  const card = useCardStyle();
  const contractId = route.params?.contractId;
  const loadContract = useCallback(() => fetchContract(contractId), [contractId]);
  const { loading, data: contract, error, reload } = useAsync(loadContract);
  // The contract's renewal request (renewalService — MOCK). Refreshed when coming back from Renew / Renewal Status.
  const loadRenewal = useCallback(() => fetchRenewal(contractId), [contractId]);
  const renewalState = useAsync(loadRenewal, { keepData: true });
  const renewal = renewalState.data;
  const skipFirstFocus = useRef(true);
  const reloadRenewal = renewalState.reload;
  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocus.current) {
        skipFirstFocus.current = false;
        return;
      }
      reloadRenewal();
    }, [reloadRenewal])
  );

  const renderContent = () => {
    if (loading) return <DetailSkeleton />;
    if (error?.code === "NOT_FOUND") {
      return (
        <EmptyState
          icon="document-text-outline"
          title="This contract is no longer available"
          message="Your current contracts are listed on your dashboard."
        >
          <AnimatedButton label="Back to dashboard" onPress={() => navigation.popToTop()} />
        </EmptyState>
      );
    }
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load this contract"
          message={errorMessage(error)}
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }

    const hasDues = contract.outstanding > 0;
    // Real API contracts don't report payment status yet (null = unknown), so they list their
    // installments without claiming anything is due or paid.
    const paymentUnknown = contract.outstanding == null;
    const payTarget = paymentUnknown ? payNowTarget(summarizePayments([contract])) : null;
    const dueBills = contract.bills.filter((bill) => bill.status === "due");
    const openBill = (billNumber) => navigation.navigate("BillViewer", { contractId: contract.id, billNumber });
    // Renewal REQUEST eligibility (renewalService): active contracts without a request in progress.
    const eligibility = renewalEligibility(contract, renewal); // active + inside the expiry window (renewalService)
    const canRenew = !renewalState.loading && eligibility.canRequest;
    const openRenew = () => navigation.navigate("RenewContract", { contractId: contract.id });
    const renewButton = canRenew ? (
      <View style={{ marginTop: hasDues ? 4 : 16 }}>
        <AnimatedButton
          label="Renew contract"
          variant={hasDues ? "ghost" : "primary"}
          onPress={openRenew}
        />
      </View>
    ) : eligibility.reason === "outside-window" && eligibility.opensOn ? (
      <Text style={[TYPE.caption, { color: colors.textSubtle, textAlign: "center", marginTop: 16 }]}>
        Renewal requests open {formatDate(eligibility.opensOn)} ({getExpiryWarningDays()} days before the end date).
      </Text>
    ) : null;

    const billsList = (
      <>
        <SectionHeading style={{ marginTop: 16 }}>Bills</SectionHeading>
        <View style={[card, { marginBottom: 8 }]}>
          {contract.bills.map((bill, index) => (
            <PressableScale
              key={bill.number}
              onPress={() => openBill(bill.number)}
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityLabel={["View bill", bill.number, paymentBadge(bill.status, bill)].filter(Boolean).join(", ")}
              containerStyle={{ borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.divider }}
              style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: RADIUS.sm,
                  backgroundColor: colors.surfaceMuted,
                  borderWidth: 1,
                  borderColor: colors.surfaceBorder,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="receipt-outline" size={18} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[TYPE.value, { color: colors.text, marginBottom: 2 }]}>{bill.number}</Text>
                <Text style={[TYPE.caption, { color: colors.textMuted }]}>
                  {bill.periodLabel ?? formatMonth(bill.month)} · {formatBHD(bill.amount)}
                  {bill.dueDate ? ` · Due ${formatDate(bill.dueDate)}` : ""}
                </Text>
              </View>
              <StatusBadge status={paymentBadge(bill.status, bill)} />
              <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} style={{ marginLeft: 6 }} />
            </PressableScale>
          ))}
        </View>
      </>
    );

    const termRows = [
      { label: "Unit", value: unitWithLocation(contract.unit, contract.location) },
      ...(contract.startDate ? [{ label: "Start date", value: formatDate(contract.startDate) }] : []),
      ...(contract.endDate
        ? [{ label: contract.status === "expired" ? "Ended" : "End date", value: formatDate(contract.endDate) }]
        : []),
    ];

    return (
      <View>
        {contract.demo ? (
          // ⚠️ A demo tenant's SAMPLE contract (services/mock/mockTenantContracts.js) — say so plainly.
          <InfoNote boxed style={{ marginBottom: 16 }}>
            DEMO contract — sample data created in the app for demonstration. It isn&apos;t MAZ data and nothing about it
            is sent to MAZ.
          </InfoNote>
        ) : null}

        <FadeIn index={1}>
          <ExpiryAlert contract={contract} canRenew={canRenew} onRenew={openRenew} />
        </FadeIn>

        {/* The contract as one document: each former card is a section, split by perforations. */}
        <FadeIn index={2}>
          <DocumentSheet
            style={{ marginBottom: 24 }}
            sections={[
              { key: "term", title: "Contract term", rows: termRows },
              renewal
                ? {
                    key: "renewal",
                    title: RENEWALS_ARE_DEMO ? "Renewal request (demo)" : "Renewal request",
                    rows: [
                      { label: "Status", value: <StatusBadge status={renewal.status} /> },
                      { label: "Renewal term", value: formatTerm(renewal.termMonths) },
                      { label: "Proposed end date", value: formatDate(renewal.proposedEndDate) },
                      { label: "Requested", value: formatDate(renewal.requestedOn) },
                    ],
                    children: (
                      <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, paddingVertical: 2 }}>
                        <TextLink
                          align="left"
                          onPress={() => navigation.navigate("RenewalStatus", { contractId: contract.id })}
                        >
                          <Text className="text-sm font-medium" style={{ color: colors.text }}>
                            View renewal status
                          </Text>
                        </TextLink>
                      </View>
                    ),
                  }
                : null,
              amountRows(contract).length > 0
                ? {
                    key: "rent",
                    title: "Rent and deposit",
                    rows: amountRows(contract),
                    children:
                      contractAmounts(contract).installmentCount > 0 ? (
                        <InfoNote style={{ paddingBottom: 14, paddingTop: 2 }}>
                          Calculated totals add up this contract&apos;s {contractAmounts(contract).installmentCount}{" "}
                          installments.
                        </InfoNote>
                      ) : null,
                  }
                : null,
              contract.bill
                ? {
                    key: "bill",
                    title: "Bill details",
                    rows: [
                      { label: "Bill no.", value: contract.bill.number },
                      {
                        label: "Billing period",
                        value: `${formatDate(contract.bill.periodStart)} – ${formatDate(contract.bill.periodEnd)}`,
                      },
                    ],
                    children: (
                      <TextLink align="left" onPress={() => openBill(contract.bill.number)} style={{ marginBottom: 6 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: "600" }}>View bill {"→"}</Text>
                      </TextLink>
                    ),
                  }
                : null,
              contract.payment
                ? {
                    key: "payment",
                    title: "Payment details",
                    rows: [
                      { label: "Payment method", value: contract.payment.method },
                      {
                        label: "Last payment",
                        value: `${formatBHD(contract.payment.lastAmount)} on ${formatDate(contract.payment.lastDate)}`,
                      },
                      { label: "Receipt", value: contract.payment.receipt },
                    ],
                  }
                : null,
            ]}
          />
        </FadeIn>

        {hasDues ? (
          <>
            <View style={[card, { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6, marginBottom: 16 }]}>
              <Text style={[TYPE.cardTitle, { color: colors.text, marginBottom: 14 }]}>Payment due</Text>
              <AmountHero label="Outstanding balance" amount={formatBHD(contract.outstanding)} style={{ marginBottom: 12 }} />
              {[
                { label: "Due date", value: formatDate(contract.dueDate) },
                { label: "Due bills", value: String(dueBills.length) },
              ].map((row) => (
                <View
                  key={row.label}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: colors.divider,
                  }}
                >
                  <Text style={[TYPE.label, { color: colors.textMuted }]}>{row.label}</Text>
                  <Text style={[TYPE.label, { color: colors.text, fontWeight: "500" }]}>{row.value}</Text>
                </View>
              ))}
            </View>

            {billsList}

            <View style={{ marginTop: 22 }}>
              <AnimatedButton
                label="Pay outstanding balance"
                onPress={() => navigation.navigate("Payment", { contractId: contract.id })}
              />
            </View>
            {renewButton}
          </>
        ) : paymentUnknown ? (
          <>
            {contract.bills.length > 0 ? billsList : null}
            {contract.bills.length > 0 ? (
              <InfoNote style={{ marginTop: 6 }}>
                Paid / Unpaid: {PAYMENT_STATUS_NOTE}.
                {contract.bills.some((bill) => bill.demoPaid)
                  ? " Paid (demo) = paid with a demo payment this session; nothing was sent to MAZ."
                  : ""}
              </InfoNote>
            ) : null}
            {/* Real MAZ contract: pay the due installments first, else the outstanding balance (paymentService). */}
            {payTarget ? (
              <View style={{ marginTop: 22 }}>
                <AnimatedButton
                  label={`${payTarget.kind === "due" ? "Pay due amount" : "Pay outstanding balance"} · ${formatBHD(payTarget.amount)}`}
                  onPress={() => navigation.navigate("PaymentReview", { scope: { type: "contract", contractId: contract.id } })}
                />
                {PAYMENTS_ARE_DEMO ? (
                  <Text style={[TYPE.caption, { color: colors.textSubtle, textAlign: "center", marginTop: 10 }]}>
                    Demo payment — no money is charged.
                  </Text>
                ) : null}
              </View>
            ) : null}
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

  // Contract cover: the document's identity — eyebrow, contract number, unit, status — over an architectural photo.
  // Shown once the contract has loaded; loading / error states keep the plain layout with a normal Back button.
  const showCover = !loading && !error && Boolean(contract);
  const renderCover = () => (
    <PhotoHero
      photo="contract"
      overlay="navy"
      minHeight={340}
      contentStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24, justifyContent: "space-between" }}
    >
      <BackButton onHero onPress={() => navigation.goBack()} />
      <FadeIn style={{ paddingTop: 64 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <Ionicons name="document-text-outline" size={14} color={colors.onHeroMuted} style={{ marginRight: 6 }} />
          <Text style={[TYPE.overline, { color: colors.onHeroMuted }]}>{contract.demo ? "Demo contract" : "Contract"}</Text>
        </View>
        <Text
          accessibilityRole="header"
          style={{ color: colors.onHero, fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.6, fontVariant: ["tabular-nums"] }}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {contract.id}
        </Text>
        <Text style={{ color: colors.onHeroMuted, fontSize: 16, lineHeight: 22, marginTop: 6 }}>
          {unitWithLocation(contract.unit, contract.location)}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 20,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: colors.heroDivider,
          }}
        >
          <StatusBadge status={contract.status} />
          {contract.demo ? <StatusBadge status="demo" /> : null}
          <Text style={{ color: colors.onHeroMuted, fontSize: 13 }}>
            {contract.status === "expired"
              ? `Ended ${formatDate(contract.endDate)}`
              : contract.paidThrough
                ? `Paid through ${formatMonth(contract.paidThrough)}`
                : null}
          </Text>
        </View>
      </FadeIn>
    </PhotoHero>
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {showCover ? renderCover() : null}
        <View className="flex-1 px-6 pb-10" style={{ paddingTop: showCover ? 24 : 32 }}>
          {showCover ? null : <BackButton onPress={() => navigation.goBack()} />}
          {renderContent()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
