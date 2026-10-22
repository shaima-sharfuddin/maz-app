import { useCallback, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import { DetailRows } from "../components/DetailCard";
import { Ionicons } from "@expo/vector-icons";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import PaymentMethodOption from "../components/PaymentMethodOption";
import ScreenTitle from "../components/ScreenTitle";
import SectionHeading from "../components/SectionHeading";
import SegmentedControl from "../components/SegmentedControl";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import useSubmit from "../hooks/useSubmit";
import useZodForm from "../hooks/useZodForm";
import { paymentContactSchema } from "../validation/schemas";
import { useAuth } from "../auth/AuthContext";
import {
  preparePayment,
  submitPayment,
  getPaymentMethods,
  knownPayerMobile,
  PAYMENTS_ARE_DEMO,
  PAYMENT_SUMMARY_NOTE,
  errorMessage,
} from "../services/api";
import { formatBHD } from "../data/pricing";
import { formatDate } from "../utils/formatDate";
import { unitWithLocation } from "../utils/formatUnit";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";
import { TYPE } from "../theme/theme";
import FadeIn from "../components/FadeIn";
import HeroPanel from "../components/HeroPanel";
import AmountHero from "../components/AmountHero";
import InfoNote from "../components/InfoNote";
import FormField from "../components/FormField";
import StyledInput from "../components/StyledInput";
import TapWarmup from "../components/TapWarmup";
import { homeRoute } from "../utils/navigation";

const TITLES = { due: "Pay due amount", balance: "Pay outstanding balance", bill: "Pay this bill" };
const PROGRESS_LABELS = { starting: "Starting payment…", processing: "Processing payment…" };
const ACCOUNT_SCOPE = { type: "account" }; // module-level so the loader below stays stable
const TEST_OUTCOMES = [
  { value: "succeed", label: "Succeed" },
  { value: "decline", label: "Decline" },
];

function ReviewSkeleton() {
  return [0, 1].map((key) => (
    <SkeletonCard key={key} style={{ marginBottom: 16 }}>
      <Skeleton width="40%" height={16} style={{ marginBottom: 14 }} />
      <Skeleton width="90%" height={12} style={{ marginBottom: 8 }} />
      <Skeleton width="70%" height={12} />
    </SkeletonCard>
  ));
}

// Existing User: Pay (dashboard / Contract Details / Bill Details) → here → Confirm → Payment Successful
// (PaymentReceipt) or Payment Failed. What's being paid comes from the REAL MAZ bills (paymentService.preparePayment);
// the payment itself is DEMO / TEST while PAYMENTS_ARE_DEMO (services/mock/mockPayments.js) — nothing is charged
// and nothing is sent to MAZ. Live (the default; EXPO_PUBLIC_TAP_PAYMENTS=false → demo): the payer's mobile is asked for (pre-filled from sign-up when known), MAZ creates a Tap
// charge and Tap's payment page opens in an in-app browser; afterwards this screen says the payment is waiting for
// MAZ to record it (no status endpoint yet — never "paid").
// route.params.scope: { type: "account" | "contract" | "bill", contractId?, billNumber? }
export default function PaymentReviewScreen({ navigation, route }) {
  const { colors } = useTheme();
  const card = useCardStyle();
  const scope = route.params?.scope ?? ACCOUNT_SCOPE;
  const loadPlan = useCallback(() => preparePayment(scope), [scope]);
  const { loading, data: plan, error, reload } = useAsync(loadPlan);

  const methods = getPaymentMethods();
  const [methodId, setMethodId] = useState(methods[0]?.id);
  const [testOutcome, setTestOutcome] = useState("succeed");
  const [progress, setProgress] = useState(null);
  const pay = useSubmit(submitPayment);
  const { user } = useAuth();
  // Tap needs the payer's mobile: pre-filled with the sign-up number when this app run knows it.
  const contact = useZodForm(paymentContactSchema, { mobile: knownPayerMobile(user?.email) ?? "" });

  const onConfirm = async () => {
    const customer = PAYMENTS_ARE_DEMO
      ? undefined
      : { name: user?.name || user?.companyName || user?.email, email: user?.email, mobile: contact.getValues("mobile") };
    const result = await pay.submit(plan, methodId, { testOutcome, onProgress: setProgress, customer });
    setProgress(null);
    if (!result) return; // network / validation problem — shown by the ErrorBanner
    if (result.status === "checkout") {
      navigation.navigate("TapCheckout", {
        checkout: result,
        purpose: { type: "bills", contractIds: plan.contractIds },
      });
      return;
    }
    if (result.status === "failed") {
      navigation.navigate("PaymentFailed", { amount: plan.amount, message: result.message });
      return;
    }
    // Fresh stack: the contract (if one) and the dashboard reload with the bills shown as paid; Back from the
    // receipt can't return to this already-paid review.
    const contractRoute =
      plan.contractIds.length === 1 ? [{ name: "ContractDetail", params: { contractId: plan.contractIds[0] } }] : [];
    navigation.reset({
      index: contractRoute.length + 1,
      routes: [homeRoute(), ...contractRoute, { name: "PaymentReceipt", params: { receipt: result.receipt } }],
    });
  };

  const renderContent = () => {
    if (loading) return <ReviewSkeleton />;
    if (error?.code === "NOTHING_DUE") {
      return (
        <EmptyState icon="checkmark-circle-outline" title="Nothing to pay" message="There's no payment due right now.">
          <AnimatedButton label="Go back" variant="ghost" onPress={() => navigation.goBack()} />
        </EmptyState>
      );
    }
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't prepare this payment"
          message={errorMessage(error)}
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }

    const singleContract = plan.contractIds.length === 1;
    return (
      <View>
        {/* One financial panel: the amount leads, then what it covers. */}
        <FadeIn>
          <HeroPanel style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 }}>
            <Text style={[TYPE.cardTitle, { color: colors.onHero, marginBottom: 18 }]}>Amount</Text>
            <AmountHero
              onHero
              size="display"
              label="Total payable"
              amount={formatBHD(plan.amount)}
              style={{ marginBottom: 16 }}
            />
            <DetailRows onHero firstDivider rows={[{ label: "Due amount", value: formatBHD(plan.dueAmount) }]} />
            <Text style={[TYPE.overline, { color: colors.onHeroSubtle, marginTop: 18, marginBottom: 2 }]}>
              You&apos;re paying for
            </Text>
            <DetailRows
              onHero
              rows={[
                {
                  label: singleContract ? "Contract" : "Contracts",
                  value: plan.contractIds.join(", "),
                },
                ...(singleContract && plan.bills[0]?.unit
                  ? [{ label: "Unit", value: unitWithLocation(plan.bills[0].unit, null) }]
                  : []),
                { label: plan.bills.length === 1 ? "Bill" : "Bills", value: String(plan.bills.length) },
              ]}
            />
          </HeroPanel>
          <InfoNote style={{ marginTop: 12, marginBottom: 24, paddingHorizontal: 4 }}>
            Amounts are MAZ&apos;s installment figures. Paid / unpaid: {PAYMENT_SUMMARY_NOTE}.
          </InfoNote>
        </FadeIn>

        {/* The bills being paid, as a ledger. */}
        <FadeIn index={1}>
          <View style={[card, { paddingHorizontal: 16, paddingVertical: 4, marginBottom: 16 }]}>
            {plan.bills.map((bill, index) => (
              <View
                key={bill.number}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: colors.divider,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
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
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[TYPE.value, { color: colors.text, fontSize: 14 }]}>{bill.number}</Text>
                  <Text style={[TYPE.caption, { color: colors.textMuted, marginTop: 2 }]}>
                    {[bill.periodLabel, bill.dueDate ? `Due ${formatDate(bill.dueDate)}` : null].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                <Text style={[TYPE.label, { color: colors.text, fontWeight: "600", fontVariant: ["tabular-nums"] }]}>
                  {formatBHD(bill.amount)}
                </Text>
              </View>
            ))}
          </View>
        </FadeIn>

        <SectionHeading style={{ marginTop: 16 }}>Payment method</SectionHeading>
        {methods.map((method) => (
          <PaymentMethodOption
            key={method.id}
            method={method}
            selected={method.id === methodId}
            onSelect={() => setMethodId(method.id)}
          />
        ))}

        {PAYMENTS_ARE_DEMO ? null : (
          <View style={{ marginTop: 16 }}>
            <FormField
              control={contact.control}
              name="mobile"
              component={StyledInput}
              label="Mobile number"
              placeholder="e.g. 3612 3456"
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <InfoNote style={{ marginTop: -8, marginBottom: 24, paddingHorizontal: 4 }}>
              Tap&apos;s secure page opens next. Choose your card or BenefitPay there.
            </InfoNote>
          </View>
        )}

        {PAYMENTS_ARE_DEMO ? (
          <View style={{ marginTop: 16 }}>
            {/* DEMO ONLY — lets testers show both outcomes. Removed with the mock provider. */}
            <SegmentedControl
              label="Demo test outcome"
              value={testOutcome}
              onChange={setTestOutcome}
              options={TEST_OUTCOMES}
            />
            <InfoNote boxed style={{ marginTop: -4, marginBottom: 24 }}>
              DEMO / TEST payment — no money is charged and nothing is sent to MAZ. Not an official MAZ payment.
            </InfoNote>
          </View>
        ) : null}

        <AnimatedButton
          label={
            pay.loading
              ? (PROGRESS_LABELS[progress] ?? "Processing payment…")
              : `${PAYMENTS_ARE_DEMO ? "Confirm demo payment" : "Continue to payment"} · ${formatBHD(plan.amount)}`
          }
          onPress={onConfirm}
          disabled={!methodId || (!PAYMENTS_ARE_DEMO && !contact.formState.isValid)}
          loading={pay.loading}
        />
        <ErrorBanner message={pay.error} onRetry={onConfirm} />
        <View style={{ marginTop: 8 }}>
          <AnimatedButton label="Cancel" variant="ghost" onPress={() => navigation.goBack()} disabled={pay.loading} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.canvas }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />
          <ScreenTitle
            eyebrow={PAYMENTS_ARE_DEMO ? "Demo payment" : "Payment"}
            title={plan ? TITLES[plan.kind] : "Review payment"}
            subtitle="Check what you're paying before you confirm."
          />
          {renderContent()}
        </View>
      </ScrollView>
      <TapWarmup enabled={!PAYMENTS_ARE_DEMO} />
    </SafeAreaView>
  );
}
