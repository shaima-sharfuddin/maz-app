import { View, ScrollView } from "react-native";
import { useWatch } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
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
  PAYMENT_IN_FULL_LABEL,
  PLACEHOLDER_MONTHLY_RATE_BHD,
  crLabel,
  isNewCr,
  firstInvoice,
  rentLineLabel,
  formatTerm,
  formatBHD,
} from "../data/pricing";
import { useTheme } from "../theme/ThemeContext";

// BrowsePlans / dashboard service → here → ReviewRequest → RequestStatus. The tenant chooses the lease length (any whole
// number of months, 1–36 — client decision, 2026-10-07). There is no payment frequency: new requests are paid in full,
// upfront (2026-10-14), so the estimate shows the whole lease's rent + deposit as separate lines (rate and deposit are
// PLACEHOLDERS, data/pricing.js). ReviewRequest then submits it with the signed-in user's details — no details form
// (client feedback, 2026-10-07). Office Suites arrive from CommercialRegistration with `cr`
// ({ option: "existing" | "new", number }): shown as a row, and a new CR adds the (sample) CR registration fee.
export default function SelectTermScreen({ navigation, route }) {
  const { colors } = useTheme();
  const plan = route.params?.plan;
  const cr = route.params?.cr ?? null;
  const newCr = isNewCr(cr);
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useZodForm(selectTermSchema, { termMonths: DEFAULT_LEASE_MONTHS });
  const termMonths = useWatch({ control, name: "termMonths" });

  const invoice = firstInvoice(termMonths, { newCr });
  const rows = [
    cr ? { label: "Commercial registration", value: crLabel(cr) } : null,
    { label: "Lease length", value: formatTerm(termMonths) },
    { label: "Payment", value: PAYMENT_IN_FULL_LABEL },
    { label: "Monthly rate", value: `${formatBHD(PLACEHOLDER_MONTHLY_RATE_BHD)}/month` },
    { label: rentLineLabel(termMonths), value: formatBHD(invoice.rent) },
    { label: "Deposit", value: formatBHD(invoice.deposit) },
    newCr ? { label: "CR registration fee", value: formatBHD(invoice.crFee) } : null,
  ].filter(Boolean);

  const onReview = handleSubmit((values) => {
    navigation.navigate("ReviewRequest", { plan, termMonths: values.termMonths, cr });
  });

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />

          <ScreenTitle
            eyebrow={plan?.title}
            title="Your lease term"
            subtitle="Choose how long you'd like to lease. The lease is paid in full, upfront — the amounts shown are estimates for your request."
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

          <EstimateCard
            rows={rows}
            totalLabel="Total payable"
            total={formatBHD(invoice.total)}
            note={
              newCr
                ? "You pay the full lease rent upfront, plus the deposit and the CR registration fee. Sample rate, deposit and fee — MAZ confirms final pricing after reviewing your request."
                : "You pay the full lease rent upfront, plus the deposit. Sample rate and deposit — MAZ confirms final pricing after reviewing your request."
            }
            style={{ marginTop: 4, marginBottom: 32 }}
          />

          <AnimatedButton label="Review request" onPress={onReview} disabled={!isValid} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
