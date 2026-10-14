import { useEffect, useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import OtpInput from "../components/OtpInput";
import FormField from "../components/FormField";
import ErrorBanner from "../components/ErrorBanner";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import IconBadge from "../components/IconBadge";
import TextLink from "../components/TextLink";
import InfoNote from "../components/InfoNote";
import useZodForm from "../hooks/useZodForm";
import useSubmit from "../hooks/useSubmit";
import { verifyAccountSchema } from "../validation/schemas";
import { verifyAndRegister, resendVerificationCode } from "../services/api";
import { useTheme } from "../theme/ThemeContext";

const RESEND_COOLDOWN_S = 30;

// Email OTP after New User sign-up — REAL (2026-10-14): MAZ emails the code (POST /sendotp, sent by registerNewUser on
// "Submit & verify email"; Resend asks again). Verify = verifyAndRegister: MAZ checks the code (POST /verifyotp), and
// only then creates the MAZ login (POST /register) from the sign-up details. Afterwards → Login with the email +
// password the user chose.
export default function VerifyAccountScreen({ navigation, route }) {
  const { colors } = useTheme();
  const email = route.params?.email ?? "";
  // From NewUserSignUp: "recorded" (MAZ confirmed the enquiry) | "failed" (not sent) | undefined (sending switched off).
  const enquiry = route.params?.enquiry;
  // Same for the customer record (POST /customers).
  const customer = route.params?.customer;
  // false when MAZ couldn't send the first code (codeError says why): Resend is offered at once.
  const codeSent = route.params?.codeSent !== false;
  const codeError = route.params?.codeError;
  const {
    control,
    handleSubmit,
    setValue,
    formState: { isValid },
  } = useZodForm(verifyAccountSchema, { code: "" });

  const verify = useSubmit(verifyAndRegister);
  const resend = useSubmit(resendVerificationCode);
  const [secondsLeft, setSecondsLeft] = useState(codeSent ? RESEND_COOLDOWN_S : 0);
  const [resentNotice, setResentNotice] = useState(false);

  // Resend cooldown countdown.
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const onSubmit = handleSubmit(async ({ code }) => {
    const result = await verify.submit({ email, code });
    // The MAZ login now exists (POST /register) but there's no session: verification ends at Login.
    if (result) navigation.replace("Login", { email, justVerified: true });
  });

  // Clear a wrong code so it can be retyped. Other failures keep it, so "Try again" can resubmit (once the code has
  // passed, only the account creation is retried).
  useEffect(() => {
    if (verify.errorCode === "INVALID_CODE") setValue("code", "", { shouldValidate: false });
  }, [verify.errorCode, setValue]);

  const verifyErrorAction = () => {
    switch (verify.errorCode) {
      case "INVALID_CODE":
        return {};
      case "ACCOUNT_EXISTS":
        return { retryLabel: "Log in", onRetry: () => navigation.replace("Login", { email }) };
      case "SIGN_UP_EXPIRED":
        return { retryLabel: "Sign up again", onRetry: () => navigation.navigate("NewUserSignUp") };
      default:
        return { onRetry: onSubmit };
    }
  };

  const onResend = async () => {
    setResentNotice(false);
    const result = await resend.submit(email);
    if (result) {
      setResentNotice(true);
      setSecondsLeft(RESEND_COOLDOWN_S);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-10">
            <BackButton onPress={() => navigation.goBack()} />

            <IconBadge icon="mail-unread-outline" style={{ marginBottom: 20 }} />
            <ScreenTitle
              eyebrow="MAZ Business Center"
              title="Verify your email"
              subtitle={`Enter the 6-digit code we emailed to ${email || "your email"}. It may take a minute to arrive — check your spam folder too.`}
            />

            {!codeSent && !resentNotice ? (
              <ErrorBanner message={`We couldn't send your code. ${codeError ?? ""} Tap "Resend code" below.`.trim()} />
            ) : null}

            {enquiry === "recorded" ? (
              <InfoNote boxed icon="checkmark-circle-outline" style={{ marginBottom: 20 }}>
                Your enquiry has been received by MAZ.
              </InfoNote>
            ) : enquiry === "failed" ? (
              <InfoNote boxed style={{ marginBottom: 20 }}>
                Your enquiry wasn&apos;t sent to MAZ. You can still continue with the demo.
              </InfoNote>
            ) : null}
            {customer === "recorded" ? (
              <InfoNote boxed icon="checkmark-circle-outline" style={{ marginBottom: 20 }}>
                Your customer record has been created with MAZ.
              </InfoNote>
            ) : customer === "failed" ? (
              <InfoNote boxed style={{ marginBottom: 20 }}>
                Your customer record wasn&apos;t created with MAZ. You can still continue with the demo.
              </InfoNote>
            ) : null}

            <FormField
              control={control}
              name="code"
              component={OtpInput}
              // Submit automatically once all 6 digits are in.
              onComplete={() => onSubmit()}
            />

            <AnimatedButton
              label={verify.loading ? "Verifying…" : "Verify"}
              onPress={onSubmit}
              disabled={!isValid}
              loading={verify.loading}
            />
            {/* A wrong code needs retyping, not a retry; an existing account → Login; lost sign-up details → sign up
                again; network-type failures get "Try again" (it retries only the account creation once the code passed). */}
            <ErrorBanner message={verify.error} {...verifyErrorAction()} />

            <View style={{ alignItems: "center", marginTop: 16 }}>
              {secondsLeft > 0 ? (
                <Text className="text-sm" style={{ color: colors.textMuted, paddingVertical: 12 }}>
                  Resend code in {secondsLeft}s
                </Text>
              ) : (
                <TextLink onPress={resend.loading ? undefined : onResend}>
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>
                    {resend.loading ? "Sending…" : "Resend code"}
                  </Text>
                </TextLink>
              )}
              {resentNotice ? (
                <Text className="text-sm" style={{ color: colors.success }}>
                  {"✓"} A new code is on its way.
                </Text>
              ) : null}
              <ErrorBanner message={resend.error} onRetry={onResend} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
