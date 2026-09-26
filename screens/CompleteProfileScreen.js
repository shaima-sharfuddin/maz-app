import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import StyledInput from "../components/StyledInput";
import SectionCard from "../components/SectionCard";
import DateField from "../components/DateField";
import SelectField from "../components/SelectField";
import SegmentedControl from "../components/SegmentedControl";
import FormField from "../components/FormField";
import ErrorBanner from "../components/ErrorBanner";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import TextLink from "../components/TextLink";
import useZodForm from "../hooks/useZodForm";
import useSubmit from "../hooks/useSubmit";
import { completeProfileSchema } from "../validation/schemas";
import { saveProfile } from "../services/api";
import { COMPANIES, GENDERS, NATIONALITIES } from "../data/formOptions";
import { useTheme } from "../theme/ThemeContext";

const DEFAULT_VALUES = {
  customer: {
    company: "",
    customerName: "",
    vatNumber: "",
    vatRegistrationDate: null,
    crNumber: "",
    crRegistrationDate: null,
    address: "",
  },
  owner: {
    ownerName: "",
    ownerMobile: "",
    email: "",
    cprNumber: "",
    cprExpiryDate: null,
    passportNumber: "",
    passportExpiryDate: null,
    nationality: "",
    gender: "",
  },
};

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
};

// Field set mirrors MAZ's admin "Create Customer" form (rules in validation/schemas.js).
export default function CompleteProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid },
  } = useZodForm(completeProfileSchema, DEFAULT_VALUES);
  const { submit, loading, error } = useSubmit(saveProfile);
  const [ownerOpen, setOwnerOpen] = useState(false);

  // Explains a disabled Save button — required fields may be hidden in the collapsed section.
  const [customerName, ownerName, gender] = watch(["customer.customerName", "owner.ownerName", "owner.gender"]);
  const missing = [
    !customerName?.trim() && "Customer Name",
    !ownerName?.trim() && "Owner Name",
    !gender && "Gender",
  ].filter(Boolean);
  const ownerFieldsMissing = !ownerName?.trim() || !gender;

  const onSubmit = handleSubmit(async (values) => {
    const result = await submit(values);
    if (result) {
      // reset() makes the dashboard the only route, so back can't return to this form.
      navigation.reset({
        index: 0,
        routes: [{ name: "HomeDashboard", params: { ownerName: values.owner.ownerName.trim(), profileSaved: true } }],
      });
    }
  });

  const today = new Date();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-10">
            <BackButton onPress={() => navigation.goBack()} />

            <ScreenTitle
              title="Complete your profile"
              subtitle="Tell us about your company and its owner. Fields marked * are required."
            />

            <SectionCard title="Company Details" defaultExpanded>
              <FormField
                control={control}
                name="customer.company"
                component={SelectField}
                label="Company"
                options={COMPANIES}
                placeholder="Select company"
              />
              <FormField
                control={control}
                name="customer.customerName"
                component={StyledInput}
                label="Customer Name *"
                placeholder="Enter customer name"
              />
              <FormField
                control={control}
                name="customer.vatNumber"
                component={StyledInput}
                label="VAT Number"
                placeholder="15-digit VAT number"
                keyboardType="number-pad"
                maxLength={15}
              />
              <FormField
                control={control}
                name="customer.vatRegistrationDate"
                component={DateField}
                label="VAT Registration Date"
                maximumDate={today}
              />
              <FormField
                control={control}
                name="customer.crNumber"
                component={StyledInput}
                label="CR Number"
                placeholder="e.g. 123456-1"
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
              />
              <FormField
                control={control}
                name="customer.crRegistrationDate"
                component={DateField}
                label="CR Registration Date"
                maximumDate={today}
              />
              <FormField
                control={control}
                name="customer.address"
                component={StyledInput}
                label="Address"
                placeholder="Flat, building, road, block, area"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{ minHeight: 88 }}
              />
            </SectionCard>

            <SectionCard title="Owner Details" expanded={ownerOpen} onToggle={setOwnerOpen}>
              <FormField
                control={control}
                name="owner.ownerName"
                component={StyledInput}
                label="Owner Name *"
                placeholder="Enter owner name"
              />
              <FormField
                control={control}
                name="owner.ownerMobile"
                component={StyledInput}
                label="Owner Mobile"
                placeholder="+973 3xxx xxxx"
                keyboardType="phone-pad"
              />
              <FormField
                control={control}
                name="owner.email"
                component={StyledInput}
                label="Email Address"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <FormField
                control={control}
                name="owner.cprNumber"
                component={StyledInput}
                label="CPR Number"
                placeholder="9-digit CPR number"
                keyboardType="number-pad"
                maxLength={9}
              />
              <FormField
                control={control}
                name="owner.cprExpiryDate"
                component={DateField}
                label="CPR Expiry Date"
                minimumDate={tomorrow()}
              />
              <FormField
                control={control}
                name="owner.passportNumber"
                component={StyledInput}
                label="Passport Number"
                placeholder="Enter passport number"
                autoCapitalize="characters"
              />
              <FormField
                control={control}
                name="owner.passportExpiryDate"
                component={DateField}
                label="Passport Expiry Date"
                minimumDate={tomorrow()}
              />
              <FormField
                control={control}
                name="owner.nationality"
                component={SelectField}
                label="Nationality"
                options={NATIONALITIES}
                placeholder="Select nationality"
              />
              <FormField control={control} name="owner.gender" component={SegmentedControl} label="Gender *" options={GENDERS} />
            </SectionCard>

            <View className="mt-4">
              <AnimatedButton
                label={loading ? "Saving…" : "Save profile"}
                onPress={onSubmit}
                disabled={!isValid}
                loading={loading}
              />
              {!isValid && !loading ? (
                <View style={{ alignItems: "center", marginTop: 10 }}>
                  <Text className="text-sm text-center" style={{ color: colors.textMuted }}>
                    {missing.length > 0 ? `To save, fill in: ${missing.join(", ")}` : "Fix the highlighted fields to save."}
                  </Text>
                  {ownerFieldsMissing && !ownerOpen ? (
                    <TextLink onPress={() => setOwnerOpen(true)}>
                      <Text className="text-sm font-medium" style={{ color: colors.text }}>
                        Open Owner Details
                      </Text>
                    </TextLink>
                  ) : null}
                </View>
              ) : null}
              <ErrorBanner message={error} onRetry={onSubmit} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
