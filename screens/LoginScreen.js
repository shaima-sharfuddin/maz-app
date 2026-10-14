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
import { logIn } from "../services/api";
import { CONTACT } from "../data/brand";
import { useTheme } from "../theme/ThemeContext";
import { useAuth } from "../auth/AuthContext";

export default function LoginScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { signIn, sessionExpired } = useAuth();
  const justVerified = route.params?.justVerified;
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useZodForm(loginSchema, { email: route.params?.email ?? "", password: "" });

  const login = useSubmit(logIn);

  // REAL MAZ login (POST /login). Saving the session switches the navigator to the signed-in screens (App.js) — no
  // navigate() needed. The dashboard follows the login's customer id (useAccountState, auth/AuthContext.js): a MAZ
  // customer opens the Existing User (tenant) dashboard; a login without one opens the New User dashboard.
  const onSubmit = handleSubmit(async (values) => {
    const result = await login.submit(values);
    if (!result) return;
    signIn(result);
  });

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-10">
            <BackButton onPress={() => navigation.goBack()} />

            <ScreenTitle eyebrow="MAZ Business Center" title="Welcome back" subtitle="Log in to your MAZ account." />

            {sessionExpired ? (
              <Text className="text-sm mb-6" style={{ color: colors.danger, marginTop: -16 }}>
                Your session has expired. Please log in again.
              </Text>
            ) : null}

            {justVerified ? (
              <Text className="text-sm mb-6" style={{ color: colors.success, marginTop: -16 }}>
                {"✓"} Email verified (demo). Log in with the MAZ account details MAZ gives you.
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

            {/* No MAZ password-reset endpoint yet: point to MAZ instead of a link that can't work. */}
            <Text className="text-sm" style={{ color: colors.textMuted, marginTop: -8, marginBottom: 4 }}>
              Forgot your password? Contact MAZ at {CONTACT.email} or {CONTACT.phone}.
            </Text>

            <View className="mt-4">
              <AnimatedButton
                label={login.loading ? "Logging in…" : "Log in"}
                onPress={onSubmit}
                disabled={!isValid}
                loading={login.loading}
              />
              {/* Wrong credentials need retyping, not a retry; network-type failures get "Try again". */}
              <ErrorBanner message={login.error} onRetry={login.errorCode === "INVALID_CREDENTIALS" ? undefined : onSubmit} />
            </View>

            <TextLink onPress={() => navigation.navigate("NewUserSignUp")} style={{ marginTop: 12 }}>
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
