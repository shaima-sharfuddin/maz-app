import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import ErrorBanner from "../components/ErrorBanner";
import ScreenTitle from "../components/ScreenTitle";
import TextLink from "../components/TextLink";
import ProfileFormFields, {
  EMPTY_PROFILE,
  ProfileSaveHint,
  useMissingProfileFields,
} from "../components/ProfileFormFields";
import useZodForm from "../hooks/useZodForm";
import useSubmit from "../hooks/useSubmit";
import { completeProfileSchema } from "../validation/schemas";
import { saveProfile } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useAuth } from "../auth/AuthContext";

// Onboarding: the Create Customer form (fields in components/ProfileFormFields.js, shared with EditProfile).
export default function CompleteProfileScreen() {
  const { colors } = useTheme();
  const { user, completeProfile, signOut } = useAuth();
  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid },
  } = useZodForm(completeProfileSchema, EMPTY_PROFILE);
  const { submit, loading, error } = useSubmit(saveProfile);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const { missing, ownerFieldsMissing } = useMissingProfileFields(watch);

  // Marking the profile complete switches the navigator to the dashboard screens (App.js), so this
  // onboarding form can't be reached with Back afterwards.
  const onSubmit = handleSubmit(async (values) => {
    const result = await submit({ ...values, email: user?.email });
    if (result) completeProfile(values.owner.ownerName.trim());
  });

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-10">
            {/* First screen after logging in, so there's nothing to go back to — offer log out instead. */}
            <TextLink align="left" onPress={signOut} style={{ marginBottom: 12 }}>
              <Text className="text-sm" style={{ color: colors.textMuted }}>
                {user?.email ? `Not ${user.email}? ` : ""}
                <Text className="font-medium" style={{ color: colors.text }}>
                  Log out
                </Text>
              </Text>
            </TextLink>

            <ScreenTitle
              eyebrow="MAZ Business Center"
              title="Complete your profile"
              subtitle="Tell us about your company and its owner. Fields marked * are required."
            />

            <ProfileFormFields control={control} ownerOpen={ownerOpen} onOwnerToggle={setOwnerOpen} />

            <View>
              <AnimatedButton
                label={loading ? "Saving…" : "Save profile"}
                onPress={onSubmit}
                disabled={!isValid}
                loading={loading}
              />
              {!loading ? (
                <ProfileSaveHint
                  invalid={!isValid}
                  missing={missing}
                  ownerFieldsMissing={ownerFieldsMissing}
                  ownerOpen={ownerOpen}
                  onOpenOwner={() => setOwnerOpen(true)}
                />
              ) : null}
              <ErrorBanner message={error} onRetry={onSubmit} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
