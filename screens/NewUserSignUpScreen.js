import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  PasswordFields,
  MobileNumberField,
  RemarksField,
  IdentificationFields,
  useIdentityFields,
} from "../components/AccountDetailsFields";
import useZodForm from "../hooks/useZodForm";
import useSubmit from "../hooks/useSubmit";
import { newUserSignUpSchema, nationalPhoneDigits } from "../validation/schemas";
import { findCountry } from "../data/countryCodes";
import { GENDER } from "../data/enums";
import { registerNewUser, submitSignUpEnquiry, areEnquiriesLive, areCustomersLive, fetchActivityOptions, peekActivityOptions } from "../services/api";
import { useTheme } from "../theme/ThemeContext";

// The three form steps, then a review step (index 3) before the account is created.
const STEPS = [
  {
    label: "Company",
    title: "Your company",
    subtitle: "Tell us who the workspace is for.",
    fields: ["companyName", "customerName", "activities"],
  },
  {
    label: "Contact",
    title: "Your contact details",
    subtitle: "We'll send a verification code to your email, and keep you updated on your request.",
    fields: ["email", "password", "confirmPassword", "phoneCountry", "phoneNumber", "remarks"],
  },
  {
    label: "Identification",
    title: "Identification",
    subtitle: "Your nationality, an ID — your CPR or passport number, whichever you prefer — and gender.",
    fields: ["nationality", "idType", "cprNumber", "passportNumber", "gender"],
  },
];
const REVIEW_STEP = STEPS.length;

// Only the last 4 characters stay readable: "880112345" → "•••••2345".
const maskId = (value) => {
  const id = value.trim();
  return id.length <= 4 ? id : `${"•".repeat(id.length - 4)}${id.slice(-4)}`;
};

// Welcome → "New User" (client feedback, 2026-10-07): one short form instead of the old SignUp +
// CompleteProfile, shown a step at a time (Company → Contact → Identification → Review). Any nationality
// gives either a CPR or a passport number (their choice). On success → VerifyAccount (email OTP), which signs the
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
  // Shown at once with the best list already known (prefetched on Welcome — else the samples), then MAZ's answer.
  const [activityOptions, setActivityOptions] = useState(peekActivityOptions);
  const mounted = useRef(true);
  const loadActivities = useCallback(() => {
    fetchActivityOptions().then((result) => mounted.current && setActivityOptions(result));
  }, []);
  useEffect(() => {
    mounted.current = true;
    loadActivities();
    return () => {
      mounted.current = false;
    };
  }, [loadActivities]);
  const [step, setStep] = useState(0);
  const scrollRef = useRef(null);

  // Only the chosen ID applies (CPR or passport, any nationality); switching the ID type clears the other.
  const { idType, isCpr } = useIdentityFields(control, setValue);

  // A step's Continue is enabled once that step's own fields pass the (whole-form) schema.
  const values = useWatch({ control });

  // If MAZ's list replaces the samples after the user already picked, keep only the picks that are still offered.
  const pickedActivities = values.activities;
  useEffect(() => {
    const kept = (pickedActivities ?? []).filter((activity) => activityOptions.options.includes(activity));
    if (kept.length !== (pickedActivities ?? []).length) setValue("activities", kept, { shouldValidate: true });
  }, [activityOptions, pickedActivities, setValue]);
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
  // codeSent / codeError: whether MAZ emailed the verification code (POST /sendotp) — VerifyAccount offers Resend if not.
  const [otpOutcome, setOtpOutcome] = useState(null);
  const toVerify = (email, enquiry, customer, otp = otpOutcome) =>
    navigation.navigate("VerifyAccount", {
      email,
      enquiry,
      customer,
      codeSent: otp?.status !== "failed",
      codeError: otp?.status === "failed" ? otp.message : undefined,
    });
  const customerOutcome = (result) =>
    result.customer?.status === "recorded" ? "recorded" : result.customer?.status === "failed" ? "failed" : undefined;

  const onSubmit = handleSubmit(async ({ confirmPassword, ...formValues }) => {
    const payload = {
      ...formValues,
      // Mobile: dial code and national number kept separate ({ countryCode: "+971", phoneNumber: "501234567" });
      // phoneCountry (ISO) says which +1 / +44 country it is.
      countryCode: findCountry(formValues.phoneCountry)?.dial ?? "",
      phoneNumber: nationalPhoneDigits(formValues.phoneCountry, formValues.phoneNumber),
      cprNumber: isCpr ? formValues.cprNumber : "",
      passportNumber: isCpr ? "" : formValues.passportNumber,
    };
    const result = await submit(payload);
    if (!result) return; // the demo account failed — shown by the ErrorBanner below
    setOtpOutcome(result.otp);
    if (result.enquiry.status === "failed") {
      const { password, ...enquiryDetails } = payload; // the resend sends only the enquiry — no password kept on screen
      setUnsentEnquiry({
        email: result.email,
        payload: enquiryDetails,
        message: result.enquiry.message,
        code: result.enquiry.code,
        customer: customerOutcome(result),
      });
      return;
    }
    toVerify(result.email, result.enquiry.status === "recorded" ? "recorded" : undefined, customerOutcome(result), result.otp);
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
            options={activityOptions.options}
            sample={activityOptions.source === "sample"}
            onRetry={loadActivities}
          />
        </>
      );
    }
    if (step === 1) {
      return (
        <>
          <EmailField control={control} />
          <PasswordFields control={control} />
          <MobileNumberField control={control} />
          <RemarksField control={control} />
        </>
      );
    }
    return <IdentificationFields control={control} idType={idType} />;
  };

  const renderReview = () => (
    <>
      <DetailCard
        title="Your details"
        rows={[
          { label: "Company", value: values.companyName.trim() },
          { label: "Customer", value: values.customerName.trim() },
          { label: values.activities.length > 1 ? "Activities" : "Activity", value: values.activities.join("\n") },
          { label: "Email", value: values.email.trim() },
          {
            label: "Mobile",
            value: `${findCountry(values.phoneCountry)?.dial ?? ""} ${nationalPhoneDigits(values.phoneCountry, values.phoneNumber)}`,
          },
          ...(values.remarks?.trim() ? [{ label: "Remarks", value: values.remarks.trim() }] : []),
          { label: "Nationality", value: values.nationality },
          isCpr
            ? { label: "CPR", value: maskId(values.cprNumber) }
            : { label: "Passport", value: maskId(values.passportNumber) },
          { label: "Gender", value: GENDER[values.gender] ?? "" },
        ]}
        style={{ marginBottom: 16 }}
      />
      {/* The MAZ login is created after the code is verified (VerifyAccount → POST /register). The enquiry (EXPO_PUBLIC_SEND_ENQUIRIES) and the customer
          record (EXPO_PUBLIC_SEND_CUSTOMERS — no ID numbers) are sent only when switched on. */}
      <InfoNote style={{ marginBottom: 24 }}>
        {[
          "We'll email you a verification code. Once your email is verified, your MAZ account is created with your email and password.",
          enquiriesLive ? "Your company, name, mobile, email and remarks are also sent to MAZ as an enquiry." : null,
          customersLive
            ? "Your company, name, mobile, email, gender and nationality are also sent to MAZ to create your customer record."
            : null,
        ]
          .filter(Boolean)
          .join(" ")}
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
        label={loading ? "Sending your code…" : "Submit & verify email"}
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
