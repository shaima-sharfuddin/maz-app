import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import StyledInput from "../components/StyledInput";
import FormField from "../components/FormField";
import ErrorBanner from "../components/ErrorBanner";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import IconBadge from "../components/IconBadge";
import useZodForm from "../hooks/useZodForm";
import useSubmit from "../hooks/useSubmit";
import { forgotPasswordSchema } from "../validation/schemas";
import { sendPasswordResetCode } from "../services/api";
import { CONTACT } from "../data/brand";
import { useTheme } from "../theme/ThemeContext";

// Forgot password, step 1 (Login → "Forgot password?"): MAZ emails a 6-digit code (POST /sendotp — REAL), then
// ResetPassword takes the code + the new password (services/passwordResetService.js).
export default function ForgotPasswordScreen({ navigation, route }) {
  const { colors } = useTheme();
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useZodForm(forgotPasswordSchema, { email: route.params?.email ?? "" });

  const send = useSubmit(sendPasswordResetCode);

  const onSubmit = handleSubmit(async ({ email }) => {
    const result = await send.submit(email);
    if (result) navigation.navigate("ResetPassword", { email: result.email });
  });

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.canvas }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-10">
            <BackButton onPress={() => navigation.goBack()} />

            <IconBadge icon="lock-closed-outline" style={{ marginBottom: 20 }} />
            <ScreenTitle
              eyebrow="MAZ Business Center"
              title="Reset your password"
              subtitle="Enter the email you log in with and we'll send you a 6-digit code to set a new password."
            />

            <FormField
              control={control}
              name="email"
              component={StyledInput}
              label="Email address"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <View className="mt-4">
              <AnimatedButton
                label={send.loading ? "Sending code…" : "Send code"}
                onPress={onSubmit}
                disabled={!isValid}
                loading={send.loading}
              />
              {/* A refused address needs correcting, not a retry; network-type failures get "Try again". */}
              <ErrorBanner message={send.error} onRetry={send.errorCode === "INVALID_EMAIL" ? undefined : onSubmit} />
            </View>

            <Text className="text-sm" style={{ color: colors.textMuted, marginTop: 16 }}>
              Need help? Contact MAZ at {CONTACT.email} or {CONTACT.phone}.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
