import { useCallback, useState } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import EmptyState from "../components/EmptyState";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import ErrorBanner from "../components/ErrorBanner";
import FormField from "../components/FormField";
import StyledInput from "../components/StyledInput";
import useAsync from "../hooks/useAsync";
import useSubmit from "../hooks/useSubmit";
import useZodForm from "../hooks/useZodForm";
import { paymentContactSchema } from "../validation/schemas";
import { useAuth } from "../auth/AuthContext";
import {
  fetchContract,
  payOutstandingBalance,
  fetchRequestInvoice,
  payRequestInvoice,
  submitInvoicePayment,
  knownPayerMobile,
  PAYMENTS_ARE_DEMO,
  errorMessage,
} from "../services/api";
import { PAYMENT_METHODS } from "../data/paymentMethods";
import { formatBHD } from "../data/pricing";
import { formatDate, formatMonth } from "../utils/formatDate";
import { unitWithLocation } from "../utils/formatUnit";
import PaymentMethodOption from "../components/PaymentMethodOption";
import StickyFooter from "../components/StickyFooter";
import FadeIn from "../components/FadeIn";
import InfoNote from "../components/InfoNote";
import TapWarmup from "../components/TapWarmup";
import { Section, ListRow } from "../components/Section";
import { TYPE } from "../theme/theme";
import { useTheme } from "../theme/ThemeContext";
import { homeRoute } from "../utils/navigation";

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

// Pays either a contract's outstanding balance ({ contractId } — MOCK, unreachable today) or a new office request's
// invoice ({ requestId }, from RequestStatus at "Invoice Generated"). Both loaders return the same shape.
// Request invoice + LIVE payments (the default; EXPO_PUBLIC_TAP_PAYMENTS=false → demo): the payer's mobile is asked for (only when sign-up's is unknown),
// MAZ creates a Tap charge (paymentService.submitInvoicePayment) → TapCheckout (in-app) → PaymentResult; a CAPTURED
// payment marks the invoice Paid.
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
  const live = isInvoice && !PAYMENTS_ARE_DEMO;
  const pay = useSubmit(live ? submitInvoicePayment : isInvoice ? payRequestInvoice : payOutstandingBalance);
  const { user } = useAuth();
  const contact = useZodForm(paymentContactSchema, { mobile: "" });
  // Tap needs a mobile: use the one given at sign-up; ask only when the app doesn't have it (e.g. after a restart).
  const knownMobile = live ? knownPayerMobile(user?.email) : null;
  const askMobile = live && !knownMobile;

  const handlePay = async () => {
    if (live) {
      const customer = {
        name: user?.name || user?.companyName || user?.email,
        email: user?.email,
        mobile: knownMobile ?? contact.getValues("mobile"),
      };
      const charge = await pay.submit(contract, { customer });
      if (charge)
        navigation.navigate("TapCheckout", {
          checkout: charge,
          purpose: { type: "invoice", requestId },
        });
      return;
    }
    const receipt = await pay.submit(isInvoice ? requestId : contractId, methodId);
    if (!receipt) return; // error is shown by the ErrorBanner below
    // Fresh stack so the screen underneath re-loads with the payment, and Back from the Payment Successful
    // screen can't return to this (now paid) screen. The dashboard stays at the root of the stack.
    navigation.reset({
      index: 2,
      routes: [
        homeRoute(),
        isInvoice
          ? { name: "RequestInvoice", params: { requestId } }
          : { name: "ContractDetail", params: { contractId } },
        { name: "PaymentReceipt", params: { receipt } },
      ],
    });
  };

  const renderContent = () => {
    if (loading) return <PaymentSkeleton />;
    if (error) {
      return (
        <EmptyState icon="cloud-offline-outline" title="We couldn't load this payment" message={errorMessage(error)}>
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
    const payingFor = isInvoice
      ? [
          contract.invoiceNumber ? { label: "Invoice", value: contract.invoiceNumber } : null,
          contract.description ? { label: "Service", value: contract.description } : null,
          contract.payment ? { label: "Payment", value: contract.payment } : null,
        ].filter(Boolean)
      : [];

    // Visual system v2: hairline sections; the amount + action sit in the sticky footer.
    return (
      <View>
        <FadeIn>
          <Section first>
            <Text style={[TYPE.label, { color: colors.textMuted }]}>Amount due</Text>
            <Text
              style={[TYPE.amountDisplay, { color: colors.text, marginTop: 4 }]}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {formatBHD(contract.outstanding)}
            </Text>
            <Text style={[TYPE.body, { color: colors.textMuted, marginTop: 4 }]}>
              {[
                unitWithLocation(contract.unit, contract.location),
                contract.dueDate ? `Due by ${formatDate(contract.dueDate)}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </Section>
        </FadeIn>

        {payingFor.length > 0 ? (
          <FadeIn index={1}>
            <Section title="You're paying for">
              {payingFor.map((row) => (
                <ListRow key={row.label} label={row.label} value={row.value} />
              ))}
            </Section>
          </FadeIn>
        ) : null}

        <FadeIn index={2}>
          <Section title="Charges">
            {dueBills.map((bill) => (
              <ListRow
                key={bill.number}
                label={bill.number}
                caption={bill.periodLabel ?? formatMonth(bill.month)}
                value={formatBHD(bill.amount)}
              />
            ))}
          </Section>
        </FadeIn>

        <FadeIn index={3}>
          <Section title="Pay with">
            {live ? (
              <>
                {/* Tap's page offers the methods. */}
                <ListRow
                  icon="card-outline"
                  label="Card or BenefitPay"
                  caption="Chosen on Tap's secure page, next"
                  value={<Ionicons name="lock-closed" size={16} color={colors.success} />}
                />
                {askMobile ? (
                  <View style={{ marginTop: 12 }}>
                    <FormField
                      control={contact.control}
                      name="mobile"
                      component={StyledInput}
                      label="Mobile number"
                      placeholder="e.g. 3612 3456"
                      keyboardType="phone-pad"
                      autoComplete="tel"
                    />
                  </View>
                ) : null}
              </>
            ) : (
              <>
                {PAYMENT_METHODS.map((method) => (
                  <PaymentMethodOption
                    key={method.id}
                    method={method}
                    selected={method.id === methodId}
                    onSelect={() => setMethodId(method.id)}
                  />
                ))}
                <InfoNote style={{ marginTop: 8 }}>
                  Demo payment — no money is charged. The real payment gateway is still to be confirmed.
                </InfoNote>
              </>
            )}
          </Section>
        </FadeIn>
      </View>
    );
  };

  const canPay = !loading && !error && contract && contract.outstanding > 0;

  return (
    <SafeAreaView edges={["top"]} className="flex-1" style={{ backgroundColor: colors.canvas }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-6">
            <BackButton onPress={() => navigation.goBack()} />
            <ScreenTitle
              eyebrow={isInvoice ? `Request ${requestId}` : contractId ? `Contract ${contractId}` : undefined}
              title={isInvoice ? "Pay your invoice" : "Pay outstanding balance"}
              subtitle="Review the amount, then continue to secure payment."
            />
            {renderContent()}
          </View>
        </ScrollView>
        {canPay ? (
          <StickyFooter
            amount={formatBHD(contract.outstanding)}
            caption={live ? "Secured by Tap" : "Demo payment"}
            label={pay.loading ? (live ? "Starting…" : "Processing…") : live ? "Continue" : "Pay"}
            onPress={handlePay}
            loading={pay.loading}
            disabled={askMobile && !contact.formState.isValid}
          >
            <ErrorBanner message={pay.error} onRetry={handlePay} />
          </StickyFooter>
        ) : null}
      </KeyboardAvoidingView>
      <TapWarmup enabled={live} />
    </SafeAreaView>
  );
}
