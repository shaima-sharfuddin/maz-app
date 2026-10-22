import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useWatch } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import FormField from "../components/FormField";
import StickyFooter from "../components/StickyFooter";
import BottomSheet from "../components/BottomSheet";
import { Section, ListRow } from "../components/Section";
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
import { TYPE } from "../theme/theme";

// PlanDetail (→ CommercialRegistration for Office Suites) → here → ReviewRequest. Visual system v2: a big month counter,
// hairline price rows, and a sticky footer with the total + "Price details" sheet. The tenant chooses the lease length (any whole
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

  const [detailsOpen, setDetailsOpen] = useState(false);
  const note = newCr
    ? "You pay the full lease rent upfront, plus the deposit and the CR registration fee. Sample rate, deposit and fee — MAZ confirms final pricing after reviewing your request."
    : "You pay the full lease rent upfront, plus the deposit. Sample rate and deposit — MAZ confirms final pricing after reviewing your request.";
  const priceRows = (
    <>
      {rows.map((row) => (
        <ListRow key={row.label} label={row.label} value={row.value} />
      ))}
      <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 6 }} />
      <ListRow label="Total payable" value={formatBHD(invoice.total)} strong />
      <Text style={[TYPE.caption, { color: colors.textSubtle, marginTop: 8 }]}>{note}</Text>
    </>
  );

  const onReview = handleSubmit((values) => {
    navigation.navigate("ReviewRequest", { plan, termMonths: values.termMonths, cr });
  });

  return (
    <SafeAreaView edges={["top"]} className="flex-1" style={{ backgroundColor: colors.canvas }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-6">
          <BackButton onPress={() => navigation.goBack()} />

          <ScreenTitle
            eyebrow={plan?.title}
            title="How long would you like to lease?"
            subtitle="Any length from 1 to 36 months, paid in full, upfront."
          />

          <FormField
            control={control}
            name="termMonths"
            component={MonthsStepper}
            min={MIN_LEASE_MONTHS}
            max={MAX_LEASE_MONTHS}
            quickPicks={LEASE_QUICK_PICKS}
          />

          <Section title="Price details">{priceRows}</Section>
        </View>
      </ScrollView>

      <StickyFooter
        amount={formatBHD(invoice.total)}
        caption={`Total for ${formatTerm(termMonths)} · sample`}
        detailsLabel="Price details"
        onDetails={() => setDetailsOpen(true)}
        label="Review"
        onPress={onReview}
        disabled={!isValid}
      />

      <BottomSheet visible={detailsOpen} onClose={() => setDetailsOpen(false)} title="Price details">
        {priceRows}
      </BottomSheet>
    </SafeAreaView>
  );
}
