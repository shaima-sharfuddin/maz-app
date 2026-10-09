import { View, Text, ScrollView } from "react-native";
import { useWatch } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import SegmentedControl from "../components/SegmentedControl";
import FormField from "../components/FormField";
import EstimateCard from "../components/EstimateCard";
import MonthsStepper from "../components/MonthsStepper";
import useZodForm from "../hooks/useZodForm";
import { selectTermSchema } from "../validation/schemas";
import {
  DEFAULT_LEASE_MONTHS,
  MIN_LEASE_MONTHS,
  MAX_LEASE_MONTHS,
  LEASE_QUICK_PICKS,
  PAYMENT_FREQUENCY_OPTIONS,
  PLACEHOLDER_MONTHLY_RATE_BHD,
  estimateTotal,
  firstInvoice,
  paymentFrequencyLabel,
  formatTerm,
  formatBHD,
} from "../data/pricing";
import { useTheme } from "../theme/ThemeContext";

// BrowsePlans / dashboard service → here → ReviewRequest → RequestStatus. The tenant chooses the lease length (any whole
// number of months, 1–36 — client decision, 2026-10-07) and how often they pay; the estimate shows the
// first invoice (first installment + deposit as separate lines; rate and deposit are PLACEHOLDERS,
// data/pricing.js). ReviewRequest then submits it with the signed-in user's details — no details form
// (client feedback, 2026-10-07).
export default function SelectTermScreen({ navigation, route }) {
  const { colors } = useTheme();
  const plan = route.params?.plan;
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useZodForm(selectTermSchema, { termMonths: DEFAULT_LEASE_MONTHS, paymentFrequency: "" });
  const [termMonths, paymentFrequency] = useWatch({ control, name: ["termMonths", "paymentFrequency"] });

  const invoice = paymentFrequency ? firstInvoice(paymentFrequency, termMonths) : null;
  const rows = [
    { label: "Lease length", value: formatTerm(termMonths) },
    { label: "Payment frequency", value: paymentFrequencyLabel(paymentFrequency) ?? "Not chosen yet" },
    { label: "Monthly rate", value: `${formatBHD(PLACEHOLDER_MONTHLY_RATE_BHD)}/month` },
    { label: "First installment", value: invoice ? formatBHD(invoice.installment) : "—" },
    { label: "Deposit", value: invoice ? formatBHD(invoice.deposit) : "—" },
    { label: "Lease total (rent)", value: formatBHD(estimateTotal(termMonths)) },
  ];

  const onReview = handleSubmit((values) => {
    navigation.navigate("ReviewRequest", {
      plan,
      termMonths: values.termMonths,
      paymentFrequency: values.paymentFrequency,
    });
  });

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />

          <ScreenTitle
            eyebrow={plan?.title}
            title="Your term and payments"
            subtitle="Choose how long you'd like to lease and how often you'd like to pay — the amounts shown are estimates for your request."
          />

          <FormField
            control={control}
            name="termMonths"
            component={MonthsStepper}
            label="Lease length *"
            min={MIN_LEASE_MONTHS}
            max={MAX_LEASE_MONTHS}
            quickPicks={LEASE_QUICK_PICKS}
          />

          <FormField
            control={control}
            name="paymentFrequency"
            component={SegmentedControl}
            label="Payment frequency *"
            options={PAYMENT_FREQUENCY_OPTIONS}
          />

          <EstimateCard
            rows={rows}
            totalLabel="First invoice"
            total={invoice ? formatBHD(invoice.total) : "—"}
            note="Your first invoice covers the first installment plus the deposit. Sample rate and deposit — MAZ confirms final pricing after reviewing your request."
            style={{ marginTop: 4, marginBottom: 32 }}
          />

          <AnimatedButton label="Review request" onPress={onReview} disabled={!isValid} />
          {!isValid ? (
            <Text className="text-sm text-center mt-3" style={{ color: colors.textMuted }}>
              Choose a payment frequency to continue.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
