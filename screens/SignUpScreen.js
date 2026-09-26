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
import { signUpSchema } from "../validation/schemas";
import { signUp } from "../services/api";
import { useTheme } from "../theme/ThemeContext";

export default function SignUpScreen({ navigation }) {
  const { colors } = useTheme();
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useZodForm(signUpSchema, { fullName: "", email: "", phone: "" });
  const { submit, loading, error } = useSubmit(signUp);

  // Verify-account (OTP) isn't built yet, so a new account goes straight to Log in.
  const onSubmit = handleSubmit(async (values) => {
    const result = await submit(values);
    if (result) navigation.navigate("Login", { email: result.email, justSignedUp: true });
  });

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-10">
            <BackButton onPress={() => navigation.goBack()} />

            <ScreenTitle title="Create your account" subtitle="Just a few details to get started." />

            <FormField
              control={control}
              name="fullName"
              component={StyledInput}
              label="Full name"
              placeholder="Enter your full name"
              autoComplete="name"
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
            <FormField
              control={control}
              name="phone"
              component={StyledInput}
              label="Phone number"
              placeholder="+973 3xxx xxxx"
              keyboardType="phone-pad"
              autoComplete="tel"
            />

            <View className="mt-4">
              <AnimatedButton
                label={loading ? "Creating account…" : "Continue"}
                onPress={onSubmit}
                disabled={!isValid}
                loading={loading}
              />
              <ErrorBanner message={error} onRetry={onSubmit} />
            </View>

            <TextLink onPress={() => navigation.navigate("Login")} style={{ marginTop: 12 }}>
              <Text className="text-sm" style={{ color: colors.textMuted }}>
                Already have an account?{" "}
                <Text className="font-medium" style={{ color: colors.text }}>
                  Log in
                </Text>
              </Text>
            </TextLink>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
