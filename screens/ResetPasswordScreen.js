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
import { PasswordFields } from "../components/AccountDetailsFields";
import useZodForm from "../hooks/useZodForm";
import useSubmit from "../hooks/useSubmit";
import { resetPasswordSchema } from "../validation/schemas";
import { resetPassword, sendPasswordResetCode } from "../services/api";
import { useTheme } from "../theme/ThemeContext";

const RESEND_COOLDOWN_S = 30;

// Forgot password, step 2 (from ForgotPassword { email }): the emailed code + a new password → resetPassword
// (POST /resetpassword — an ASSUMED route until MAZ provides one; services/passwordResetService.js). Afterwards → Login
// with the email and a "Password updated" note. The password never leaves this form except in that request.
export default function ResetPasswordScreen({ navigation, route }) {
  const { colors } = useTheme();
  const email = route.params?.email ?? "";
  const {
    control,
    handleSubmit,
    setValue,
    formState: { isValid },
  } = useZodForm(resetPasswordSchema, { code: "", password: "", confirmPassword: "" });

  const save = useSubmit(resetPassword);
  const resend = useSubmit(sendPasswordResetCode);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_S);
  const [resentNotice, setResentNotice] = useState(false);

  // Resend cooldown countdown.
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const onSubmit = handleSubmit(async ({ code, password }) => {
    const result = await save.submit({ email, code, password });
    if (result) navigation.replace("Login", { email, passwordReset: true });
  });

  // Clear a wrong code so it can be retyped; the new password stays.
  useEffect(() => {
    if (save.errorCode === "INVALID_CODE") setValue("code", "", { shouldValidate: true });
  }, [save.errorCode, setValue]);

  const onResend = async () => {
    setResentNotice(false);
    const result = await resend.submit(email);
    if (result) {
      setResentNotice(true);
      setSecondsLeft(RESEND_COOLDOWN_S);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.canvas }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-10">
            <BackButton onPress={() => navigation.goBack()} />

            <IconBadge icon="key-outline" style={{ marginBottom: 20 }} />
            <ScreenTitle
              eyebrow="MAZ Business Center"
              title="Set a new password"
              subtitle={`Enter the 6-digit code we emailed to ${email || "your email"}, then choose a new password. The code may take a minute to arrive — check your spam folder too.`}
            />

            <FormField control={control} name="code" component={OtpInput} />
            <PasswordFields control={control} label="New Password" />

            <View className="mt-4">
              <AnimatedButton
                label={save.loading ? "Updating password…" : "Update password"}
                onPress={onSubmit}
                disabled={!isValid}
                loading={save.loading}
              />
              {/* A wrong code needs retyping and an unavailable reset can't be retried; other failures get "Try again". */}
              <ErrorBanner
                message={save.error}
                onRetry={save.errorCode === "INVALID_CODE" || save.errorCode === "RESET_UNAVAILABLE" ? undefined : onSubmit}
              />
            </View>

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
