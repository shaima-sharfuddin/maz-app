import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import StyledInput from "../components/StyledInput";
import FormField from "../components/FormField";
import ErrorBanner from "../components/ErrorBanner";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import TextLink from "../components/TextLink";
import useZodForm from "../hooks/useZodForm";
import useSubmit from "../hooks/useSubmit";
import { loginSchema } from "../validation/schemas";
import { logIn, requestPasswordReset } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useAuth } from "../auth/AuthContext";

export default function LoginScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const justVerified = route.params?.justVerified;
  const {
    control,
    handleSubmit,
    trigger,
    getValues,
    formState: { isValid },
  } = useZodForm(loginSchema, { email: route.params?.email ?? "", password: "" });

  const login = useSubmit(logIn);
  const reset = useSubmit(requestPasswordReset);
  const [resetSentTo, setResetSentTo] = useState("");

  // Saving the session switches the navigator to the signed-in screens (App.js) — no navigate() needed.
  // New accounts land on Complete Profile; existing ones on the dashboard.
  const onSubmit = handleSubmit(async (values) => {
    const result = await login.submit(values);
    if (result) signIn(result);
  });

  const notVerified = login.errorCode === "EMAIL_NOT_VERIFIED";

  // Uses the email already typed above; if it's missing/invalid, surface that field's error instead.
  const onForgotPassword = async () => {
    setResetSentTo("");
    const emailOk = await trigger("email");
    if (!emailOk) return;
    const email = getValues("email").trim();
    const result = await reset.submit(email);
    if (result) setResetSentTo(email);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-10">
            <BackButton onPress={() => navigation.goBack()} />

            <ScreenTitle title="Welcome back" subtitle="Log in to your MAZ account." />

            {justVerified ? (
              <Text className="text-sm mb-6" style={{ color: colors.success, marginTop: -16 }}>
                {"✓"} Email verified — please log in.
              </Text>
            ) : null}

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
            <FormField
              control={control}
              name="password"
              component={StyledInput}
              label="Password"
              placeholder="Enter your password"
              secureTextEntry
              autoComplete="password"
            />

            {/* StyledInput already adds 20pt below; pull the 44pt-tall link up so spacing stays tight. */}
            <TextLink align="right" onPress={reset.loading ? undefined : onForgotPassword} style={{ marginTop: -12 }}>
              <Text className="text-sm" style={{ color: colors.textMuted }}>
                {reset.loading ? "Sending reset link…" : "Forgot password?"}
              </Text>
            </TextLink>
            {resetSentTo ? (
              <Text className="text-sm" style={{ color: colors.success, marginBottom: 4 }}>
                {"✓"} Reset link sent to {resetSentTo}.
              </Text>
            ) : null}
            <ErrorBanner message={reset.error} onRetry={onForgotPassword} />

            <View className="mt-4">
              <AnimatedButton
                label={login.loading ? "Logging in…" : "Log in"}
                onPress={onSubmit}
                disabled={!isValid}
                loading={login.loading}
              />
              <ErrorBanner
                message={login.error}
                retryLabel={notVerified ? "Verify email" : "Try again"}
                onRetry={
                  notVerified
                    ? () => navigation.navigate("VerifyAccount", { email: getValues("email").trim() })
                    : onSubmit
                }
              />
            </View>

            <TextLink onPress={() => navigation.navigate("SignUp")} style={{ marginTop: 12 }}>
              <Text className="text-sm" style={{ color: colors.textMuted }}>
                {"Don't have an account? "}
                <Text className="font-medium" style={{ color: colors.text }}>
                  Sign up
                </Text>
              </Text>
            </TextLink>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
