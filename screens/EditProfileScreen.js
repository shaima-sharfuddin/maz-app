import { useCallback } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import ErrorBanner from "../components/ErrorBanner";
import EmptyState from "../components/EmptyState";
import ScreenTitle from "../components/ScreenTitle";
import SectionCard from "../components/SectionCard";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import { CompanyFields, EmailField } from "../components/AccountDetailsFields";
import useAsync from "../hooks/useAsync";
import useSubmit from "../hooks/useSubmit";
import useZodForm from "../hooks/useZodForm";
import { editProfileSchema } from "../validation/schemas";
import { fetchProfile, updateProfile, errorMessage } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useAuth } from "../auth/AuthContext";
import { navigateTo } from "../utils/navigation";

function ProfileSkeleton() {
  return [2, 1].map((rows, key) => (
    <SkeletonCard key={key} style={{ marginBottom: 32 }}>
      <Skeleton width="40%" height={16} style={{ marginBottom: 18 }} />
      {Array.from({ length: rows }, (_, row) => (
        <View key={row} style={{ marginBottom: 16 }}>
          <Skeleton width="30%" height={12} style={{ marginBottom: 8 }} />
          <Skeleton height={48} radius={12} />
        </View>
      ))}
    </SkeletonCard>
  ));
}

// The form, mounted once the profile has loaded so useZodForm starts from the real values.
function EditProfileForm({ email, initialValues, navigation }) {
  const { colors } = useTheme();
  const { updateUserDetails } = useAuth();
  const {
    control,
    handleSubmit,
    formState: { isValid, isDirty },
  } = useZodForm(editProfileSchema, initialValues);
  const { submit, loading, error } = useSubmit(updateProfile);

  const onSubmit = handleSubmit(async (values) => {
    const result = await submit(email, values);
    if (!result) return; // shown by the ErrorBanner below
    updateUserDetails({ name: values.customerName.trim(), companyName: values.companyName.trim() });
    // Settings is underneath, so this goes back to it (with the success note) rather than pushing a copy.
    navigateTo(navigation, "Settings", { profileUpdated: true });
  });

  return (
    <>
      <SectionCard title="Company" defaultExpanded>
        <CompanyFields control={control} />
      </SectionCard>
      <SectionCard title="Contact" defaultExpanded>
        <EmailField control={control} readOnly />
      </SectionCard>

      <View>
        <AnimatedButton
          label={loading ? "Saving…" : "Save changes"}
          onPress={onSubmit}
          disabled={!isValid || !isDirty}
          loading={loading}
        />
        {!loading && (!isValid || !isDirty) ? (
          <Text className="text-sm text-center mt-3" style={{ color: colors.textMuted }}>
            {!isValid ? "Complete the highlighted fields to save." : "No changes to save."}
          </Text>
        ) : null}
        <ErrorBanner message={error} onRetry={onSubmit} />
        <Text className="text-sm leading-5 text-center mt-4" style={{ color: colors.textMuted }}>
          Demo mode: changes are kept in the app for this session and aren&apos;t sent to MAZ.
        </Text>
      </View>
    </>
  );
}

// Settings → Account → Edit profile: Company Name, Customer Name and the read-only email (shared fields from
// components/AccountDetailsFields.js). Nationality and CPR / passport are deliberately NOT shown — the signed-in
// account is mapped to a demo MAZ customer, so the real record's identity data isn't the user's to see.
// Pre-filled by fetchProfile (saved edits → this session's sign-up → session); saving is MOCK (updateProfile,
// kept for the session) until PUT /customers is confirmed.
export default function EditProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const loadProfile = useCallback(() => fetchProfile(user), [user]);
  const { loading, data, error, reload } = useAsync(loadProfile);

  const renderContent = () => {
    if (loading) return <ProfileSkeleton />;
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load your profile"
          message={errorMessage(error)}
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }
    return <EditProfileForm email={data.email} initialValues={data.values} navigation={navigation} />;
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-10">
            <BackButton onPress={() => navigation.goBack()} />
            <ScreenTitle
              eyebrow="Account"
              title="Edit profile"
              subtitle="Keep your company and contact details up to date. All fields are required."
            />
            {renderContent()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
