import { useMemo, useRef, useState } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useWatch } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePreventRemove } from "@react-navigation/native";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import DetailCard from "../components/DetailCard";
import ErrorBanner from "../components/ErrorBanner";
import InfoNote from "../components/InfoNote";
import ScreenTitle from "../components/ScreenTitle";
import StepProgress from "../components/StepProgress";
import {
  EMPTY_ACCOUNT_DETAILS,
  ActivityField,
  CompanyFields,
  EmailField,
  MobileNumberField,
  RemarksField,
  IdentificationFields,
  useIdentityFields,
} from "../components/AccountDetailsFields";
import useZodForm from "../hooks/useZodForm";
import useSubmit from "../hooks/useSubmit";
import useAsync from "../hooks/useAsync";
import { newUserSignUpSchema, nationalPhoneDigits } from "../validation/schemas";
import { findCountry } from "../data/countryCodes";
import { registerNewUser, submitSignUpEnquiry, areEnquiriesLive, areCustomersLive, fetchActivityOptions } from "../services/api";
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
    fields: ["email", "phoneCountry", "phoneNumber", "remarks"],
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
// Submit = registerNewUser: the demo account (local) + an enquiry to MAZ (POST /enquiries: company, name, mobile, email,
// remarks) when EXPO_PUBLIC_SEND_ENQUIRIES=true. If the enquiry fails, the account still exists: the Review step then
// offers "Send enquiry again" or continuing to verification without it.
export default function NewUserSignUpScreen({ navigation }) {
  const { colors } = useTheme();
  const {
    control,
    handleSubmit,
    setValue,
    trigger,
    formState: { isValid },
  } = useZodForm(newUserSignUpSchema, EMPTY_ACCOUNT_DETAILS);
  const { submit, loading, error } = useSubmit(registerNewUser);
  const resend = useSubmit(submitSignUpEnquiry);
  const enquiriesLive = areEnquiriesLive();
  const customersLive = areCustomersLive();
  // Set when the demo account was created but MAZ didn't confirm the enquiry: { email, payload, message, code }.
  const [unsentEnquiry, setUnsentEnquiry] = useState(null);
  // Activity options: MAZ's GET /activities, or the labelled samples if it fails (never blocks sign-up).
  const activityOptions = useAsync(fetchActivityOptions, { keepData: true });
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
    if (next < REVIEW_STEP) setUnsentEnquiry(null); // edited details are submitted afresh
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  // Back (on-screen, Android hardware back and the iOS swipe) walks back through the steps first.
  usePreventRemove(step > 0 && !loading, () => goToStep(step - 1));
  const onBack = () => (step > 0 ? goToStep(step - 1) : navigation.goBack());

  const onContinue = async () => {
    if (await trigger(STEPS[step].fields)) goToStep(step + 1);
  };

  // enquiry / customer: "recorded" | "failed" | undefined (switched off) — VerifyAccount says whether MAZ received each.
  const toVerify = (email, enquiry, customer) => navigation.navigate("VerifyAccount", { email, enquiry, customer });
  const customerOutcome = (result) =>
    result.customer?.status === "recorded" ? "recorded" : result.customer?.status === "failed" ? "failed" : undefined;

  const onSubmit = handleSubmit(async (formValues) => {
    const payload = {
      ...formValues,
      // Mobile: dial code and national number kept separate ({ countryCode: "+971", phoneNumber: "501234567" });
      // phoneCountry (ISO) says which +1 / +44 country it is.
      countryCode: findCountry(formValues.phoneCountry)?.dial ?? "",
      phoneNumber: nationalPhoneDigits(formValues.phoneCountry, formValues.phoneNumber),
      cprNumber: isBahraini ? formValues.cprNumber : "",
      passportNumber: isBahraini ? "" : formValues.passportNumber,
    };
    const result = await submit(payload);
    if (!result) return; // the demo account failed — shown by the ErrorBanner below
    if (result.enquiry.status === "failed") {
      setUnsentEnquiry({
        email: result.email,
        payload,
        message: result.enquiry.message,
        code: result.enquiry.code,
        customer: customerOutcome(result),
      });
      return;
    }
    toVerify(result.email, result.enquiry.status === "recorded" ? "recorded" : undefined, customerOutcome(result));
  });

  const onResendEnquiry = async () => {
    const result = await resend.submit(unsentEnquiry.payload);
    if (result?.status === "recorded") toVerify(unsentEnquiry.email, "recorded", unsentEnquiry.customer);
  };

  const renderFields = () => {
    if (step === 0) {
      return (
        <>
          <CompanyFields control={control} />
          <ActivityField
            control={control}
            options={activityOptions.data?.options ?? []}
            loading={!activityOptions.data}
            sample={activityOptions.data?.source === "sample"}
            onRetry={activityOptions.reload}
          />
        </>
      );
    }
    if (step === 1) {
      return (
        <>
          <EmailField control={control} />
          <MobileNumberField control={control} />
          <RemarksField control={control} />
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
          ...(values.remarks?.trim() ? [{ label: "Remarks", value: values.remarks.trim() }] : []),
          { label: "Nationality", value: values.nationality },
          isBahraini
            ? { label: "CPR", value: maskId(values.cprNumber) }
            : { label: "Passport", value: maskId(values.passportNumber) },
        ]}
        style={{ marginBottom: 16 }}
      />
      {/* The LOGIN is always local (mockApi.quickSignUp). Only what's switched on is sent to MAZ: the enquiry
          (EXPO_PUBLIC_SEND_ENQUIRIES) and / or the customer record (EXPO_PUBLIC_SEND_CUSTOMERS — no ID numbers). */}
      <InfoNote style={{ marginBottom: 24 }}>
        {enquiriesLive || customersLive
          ? `${[
              enquiriesLive ? "Your company, name, mobile, email and remarks are sent to MAZ as an enquiry." : null,
              customersLive
                ? "Your company, name, mobile, email and nationality are sent to MAZ to create your customer record (your CPR / passport number isn't sent)."
                : null,
            ]
              .filter(Boolean)
              .join(" ")} Your login itself is a demo, kept in this app only.`
          : "Demo registration — your details are kept in this app only. Your account isn't created with MAZ yet."}
      </InfoNote>
      {unsentEnquiry ? renderUnsentEnquiry() : renderSubmit()}
      <View style={{ marginTop: 8 }}>
        <AnimatedButton
          label="Edit details"
          variant="ghost"
          onPress={() => goToStep(0)}
          disabled={loading || resend.loading}
        />
      </View>
    </>
  );

  const renderSubmit = () => (
    <>
      <AnimatedButton
        label={loading ? (enquiriesLive ? "Sending your details…" : "Creating your account…") : "Submit & verify email"}
        onPress={onSubmit}
        disabled={!isValid}
        loading={loading}
      />
      <ErrorBanner message={error} onRetry={onSubmit} />
    </>
  );

  // The demo account exists, but MAZ didn't confirm the enquiry. A timeout is ambiguous — MAZ may have saved it — so
  // the user is told before sending again.
  const renderUnsentEnquiry = () => (
    <>
      <ErrorBanner
        message={
          unsentEnquiry.code === "TIMEOUT" && !resend.error
            ? "MAZ took too long to confirm your enquiry. It may still have been received — sending again could create a duplicate."
            : `Your enquiry wasn't sent to MAZ. ${resend.error || unsentEnquiry.message}`
        }
      />
      <View style={{ marginTop: 16 }}>
        <AnimatedButton
          label={resend.loading ? "Sending…" : "Send enquiry again"}
          onPress={onResendEnquiry}
          loading={resend.loading}
        />
      </View>
      <View style={{ marginTop: 8 }}>
        <AnimatedButton
          label="Continue without sending"
          variant="secondary"
          onPress={() => toVerify(unsentEnquiry.email, "failed", unsentEnquiry.customer)}
          disabled={resend.loading}
        />
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
