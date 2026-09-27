import { useEffect, useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import OtpInput from "../components/OtpInput";
import FormField from "../components/FormField";
import ErrorBanner from "../components/ErrorBanner";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import TextLink from "../components/TextLink";
import useZodForm from "../hooks/useZodForm";
import useSubmit from "../hooks/useSubmit";
import { verifyAccountSchema } from "../validation/schemas";
import { verifyEmail, resendVerificationCode, MOCK_OTP_CODE } from "../services/api";
import { useTheme } from "../theme/ThemeContext";

const RESEND_COOLDOWN_S = 30;

// Step 2 of the flow: Sign up → Verify account → Log in.
export default function VerifyAccountScreen({ navigation, route }) {
  const { colors } = useTheme();
  const email = route.params?.email ?? "";
  const {
    control,
    handleSubmit,
    setValue,
    formState: { isValid },
  } = useZodForm(verifyAccountSchema, { code: "" });

  const verify = useSubmit(verifyEmail);
  const resend = useSubmit(resendVerificationCode);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_S);
  const [resentNotice, setResentNotice] = useState(false);

  // Resend cooldown countdown.
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const onSubmit = handleSubmit(async ({ code }) => {
    const result = await verify.submit({ email, code });
    if (result) {
      navigation.replace("Login", { email, justVerified: true });
    } else {
      setValue("code", "", { shouldValidate: false }); // clear a wrong code so it can be retyped
    }
  });

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

            <ScreenTitle
              title="Verify your email"
              subtitle={`Enter the 6-digit code we sent to ${email || "your email"}.`}
            />

            <FormField
              control={control}
              name="code"
              component={OtpInput}
              // Submit automatically once all 6 digits are in.
              onComplete={() => onSubmit()}
            />

            {MOCK_OTP_CODE ? (
              // DEMO ONLY — no email is actually sent while the backend is mocked.
              <Text className="text-xs text-center mb-4" style={{ color: colors.textSubtle }}>
                Demo mode: use code {MOCK_OTP_CODE}
              </Text>
            ) : null}

            <AnimatedButton
              label={verify.loading ? "Verifying…" : "Verify"}
              onPress={onSubmit}
              disabled={!isValid}
              loading={verify.loading}
            />
            {/* A wrong code needs retyping, not a retry; network-type failures get "Try again". */}
            <ErrorBanner message={verify.error} onRetry={verify.errorCode === "INVALID_CODE" ? undefined : onSubmit} />

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
