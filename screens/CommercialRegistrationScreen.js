import { useEffect } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useWatch } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import ChoiceCardGroup from "../components/ChoiceCard";
import FormField from "../components/FormField";
import InfoNote from "../components/InfoNote";
import ScreenTitle from "../components/ScreenTitle";
import StyledInput from "../components/StyledInput";
import useZodForm from "../hooks/useZodForm";
import { crChoiceSchema } from "../validation/schemas";
import { CR_OPTIONS, CR_REGISTRATION_FEE_BHD, formatBHD } from "../data/pricing";
import { useTheme } from "../theme/ThemeContext";

const OPTIONS = [
  {
    value: CR_OPTIONS.existing,
    icon: "document-text-outline",
    title: "I have a CR",
    description: "Use your company's existing commercial registration.",
  },
  {
    value: CR_OPTIONS.new,
    icon: "add-circle-outline",
    title: "I need a new CR",
    description: "MAZ registers a new commercial registration for your company.",
    footer: `Registration fee ${formatBHD(CR_REGISTRATION_FEE_BHD)} (sample) — added to your first invoice`,
  },
];

// Office Suites (BrowsePlans / dashboard → utils/openPlan.js) → here → SelectTerm { plan, cr } → ReviewRequest.
// "I have a CR" asks for the CR number; "I need a new CR" adds the (sample) CR registration fee to the first invoice
// (data/pricing.js). Mock like the rest of the request: kept in the app, never sent to MAZ.
export default function CommercialRegistrationScreen({ navigation, route }) {
  const { colors } = useTheme();
  const plan = route.params?.plan;
  const {
    control,
    handleSubmit,
    setValue,
    formState: { isValid },
  } = useZodForm(crChoiceSchema, { crOption: "", crNumber: "" });
  const crOption = useWatch({ control, name: "crOption" });

  // A CR number only belongs to "I have a CR" — clear it when the answer changes to a new CR.
  useEffect(() => {
    if (crOption === CR_OPTIONS.new) setValue("crNumber", "", { shouldValidate: true });
  }, [crOption, setValue]);

  const onContinue = handleSubmit((values) => {
    const cr =
      values.crOption === CR_OPTIONS.existing
        ? { option: CR_OPTIONS.existing, number: values.crNumber.trim() }
        : { option: CR_OPTIONS.new, number: null };
    navigation.navigate("SelectTerm", { plan, cr });
  });

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-10">
            <BackButton onPress={() => navigation.goBack()} />

            <ScreenTitle
              eyebrow={plan?.title}
              title="Your commercial registration"
              subtitle="Do you already have a Bahrain CR for your company, or would you like MAZ to register a new one?"
            />

            <FormField control={control} name="crOption" component={ChoiceCardGroup} options={OPTIONS} label="Choose one" />

            {crOption === CR_OPTIONS.existing ? (
              <FormField
                control={control}
                name="crNumber"
                component={StyledInput}
                label="CR Number"
                placeholder="e.g. 123456-1"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            ) : null}

            {crOption === CR_OPTIONS.new ? (
              <InfoNote style={{ marginBottom: 20 }}>
                Sample fee — MAZ confirms the final CR registration charges after reviewing your request.
              </InfoNote>
            ) : null}

            <View className="mt-4">
              <AnimatedButton label="Continue" onPress={onContinue} disabled={!isValid} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
