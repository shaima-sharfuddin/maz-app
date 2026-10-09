import { useMemo, useRef, useState } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useWatch } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePreventRemove } from "@react-navigation/native";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import DetailCard from "../components/DetailCard";
import ErrorBanner from "../components/ErrorBanner";
import ScreenTitle from "../components/ScreenTitle";
import StepProgress from "../components/StepProgress";
import {
  EMPTY_ACCOUNT_DETAILS,
  ActivityField,
  CompanyFields,
  EmailField,
  MobileNumberField,
  IdentificationFields,
  useIdentityFields,
} from "../components/AccountDetailsFields";
import useZodForm from "../hooks/useZodForm";
import useSubmit from "../hooks/useSubmit";
import { newUserSignUpSchema, nationalPhoneDigits } from "../validation/schemas";
import { findCountry } from "../data/countryCodes";
import { quickSignUp } from "../services/api";
import { useTheme } from "../theme/ThemeContext";

// The three form steps, then a review step (index 3) before the account is created.
const STEPS = [
  {
    label: "Company",
    title: "Your company",
    subtitle: "Tell us who the workspace is for.",
    fields: ["companyName", "customerName", "activity"],
  },
  {
    label: "Contact",
    title: "Your contact details",
    subtitle: "We'll send a verification code to your email, and keep you updated on your request.",
    fields: ["email", "phoneCountry", "phoneNumber"],
  },
  {
    label: "Identification",
    title: "Identification",
    subtitle: "Bahraini nationals give their CPR number; everyone else, their passport number.",
    fields: ["nationality", "cprNumber", "passportNumber"],
  },
];
const REVIEW_STEP = STEPS.length;

// Only the last 4 characters stay readable: "880112345" → "•••••2345".
const maskId = (value) => {
  const id = value.trim();
  return id.length <= 4 ? id : `${"•".repeat(id.length - 4)}${id.slice(-4)}`;
};

// Welcome → "New User" (client feedback, 2026-10-07): one short form instead of the old SignUp +
// CompleteProfile, shown a step at a time (Company → Contact → Identification → Review). Bahrainis give
// a CPR number, everyone else a passport number. On success → VerifyAccount (email OTP), which signs the
// user in and opens Browse Plans; the details are reused for their office request (no re-entry).
export default function NewUserSignUpScreen({ navigation }) {
  const { colors } = useTheme();
  const {
    control,
    handleSubmit,
    setValue,
    trigger,
    formState: { isValid },
  } = useZodForm(newUserSignUpSchema, EMPTY_ACCOUNT_DETAILS);
  const { submit, loading, error } = useSubmit(quickSignUp);
  const [step, setStep] = useState(0);
  const scrollRef = useRef(null);

  // Only one ID field applies (CPR for Bahrain, passport otherwise); switching nationality clears the other.
  const { nationality, isBahraini } = useIdentityFields(control, setValue);

  // A step's Continue is enabled once that step's own fields pass the (whole-form) schema.
  const values = useWatch({ control });
  const stepValid = useMemo(() => {
    if (step >= REVIEW_STEP) return isValid;
    const issues = newUserSignUpSchema.safeParse(values).error?.issues ?? [];
    return !issues.some((issue) => STEPS[step].fields.includes(issue.path[0]));
  }, [values, step, isValid]);

  const goToStep = (next) => {
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  // Back (on-screen, Android hardware back and the iOS swipe) walks back through the steps first.
  usePreventRemove(step > 0 && !loading, () => goToStep(step - 1));
  const onBack = () => (step > 0 ? goToStep(step - 1) : navigation.goBack());

  const onContinue = async () => {
    if (await trigger(STEPS[step].fields)) goToStep(step + 1);
  };

  const onSubmit = handleSubmit(async (formValues) => {
    const result = await submit({
      ...formValues,
      // Mobile: dial code and national number kept separate ({ countryCode: "+971", phoneNumber: "501234567" });
      // phoneCountry (ISO) says which +1 / +44 country it is.
      countryCode: findCountry(formValues.phoneCountry)?.dial ?? "",
      phoneNumber: nationalPhoneDigits(formValues.phoneCountry, formValues.phoneNumber),
      cprNumber: isBahraini ? formValues.cprNumber : "",
      passportNumber: isBahraini ? "" : formValues.passportNumber,
    });
    if (!result) return; // shown by the ErrorBanner below
    navigation.navigate("VerifyAccount", { email: result.email });
  });

  const renderFields = () => {
    if (step === 0) {
      return (
        <>
          <CompanyFields control={control} />
          <ActivityField control={control} />
        </>
      );
    }
    if (step === 1) {
      return (
        <>
          <EmailField control={control} />
          <MobileNumberField control={control} />
        </>
      );
    }
    return <IdentificationFields control={control} nationality={nationality} isBahraini={isBahraini} />;
  };

  const renderReview = () => (
    <>
      <DetailCard
        title="Your details"
        rows={[
          { label: "Company", value: values.companyName.trim() },
          { label: "Customer", value: values.customerName.trim() },
          { label: "Activity", value: values.activity },
          { label: "Email", value: values.email.trim() },
          {
            label: "Mobile",
            value: `${findCountry(values.phoneCountry)?.dial ?? ""} ${nationalPhoneDigits(values.phoneCountry, values.phoneNumber)}`,
          },
          { label: "Nationality", value: values.nationality },
          isBahraini
            ? { label: "CPR", value: maskId(values.cprNumber) }
            : { label: "Passport", value: maskId(values.passportNumber) },
        ]}
        style={{ marginBottom: 32 }}
      />
      <AnimatedButton
        label={loading ? "Creating your account…" : "Submit & verify email"}
        onPress={onSubmit}
        disabled={!isValid}
        loading={loading}
      />
      <ErrorBanner message={error} onRetry={onSubmit} />
      <View style={{ marginTop: 8 }}>
        <AnimatedButton label="Edit details" variant="ghost" onPress={() => goToStep(0)} disabled={loading} />
      </View>
    </>
  );

  const current = STEPS[step];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView ref={scrollRef} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-10">
            <BackButton onPress={onBack} />

            <StepProgress current={step + 1} total={STEPS.length} label={current?.label ?? "Review"} />

            {step < REVIEW_STEP ? (
              <>
                <ScreenTitle title={current.title} subtitle={current.subtitle} />
                {renderFields()}
                <View className="mt-4">
                  <AnimatedButton label="Continue" onPress={onContinue} disabled={!stepValid} />
                </View>
              </>
            ) : (
              <>
                <ScreenTitle
                  title="Review your details"
                  subtitle="Check everything is correct. We'll then email you a code to verify your address."
                />
                {renderReview()}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
