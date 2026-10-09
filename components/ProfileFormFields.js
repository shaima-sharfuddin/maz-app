import { View, Text } from "react-native";
import StyledInput from "./StyledInput";
import SectionCard from "./SectionCard";
import DateField from "./DateField";
import SelectField from "./SelectField";
import SegmentedControl from "./SegmentedControl";
import FormField from "./FormField";
import TextLink from "./TextLink";
import { COMPANIES, GENDERS, NATIONALITIES, OWNER_TYPES } from "../data/formOptions";
import { useTheme } from "../theme/ThemeContext";

// The Create Customer form's fields (mirrors MAZ's admin form; rules: completeProfileSchema in
// validation/schemas.js). Shared by CompleteProfile (onboarding) and EditProfile so the two never drift.

export const EMPTY_PROFILE = {
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
    ownerType: "",
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

// The required fields still empty — explains a disabled Save button, since they may be hidden in the
// collapsed Owner Details card. `watch` is react-hook-form's.
export function useMissingProfileFields(watch) {
  const [customerName, ownerName, ownerType, gender] = watch([
    "customer.customerName",
    "owner.ownerName",
    "owner.ownerType",
    "owner.gender",
  ]);
  const missing = [
    !customerName?.trim() && "Customer Name",
    !ownerName?.trim() && "Owner Name",
    !ownerType && "Owner Type",
    !gender && "Gender",
  ].filter(Boolean);
  return { missing, ownerFieldsMissing: !ownerName?.trim() || !ownerType || !gender };
}

// Company Details (open) + Owner Details (controlled via ownerOpen / onOwnerToggle).
export default function ProfileFormFields({ control, ownerOpen, onOwnerToggle }) {
  const today = new Date();

  return (
    <>
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

      <SectionCard title="Owner Details" expanded={ownerOpen} onToggle={onOwnerToggle}>
        <FormField
          control={control}
          name="owner.ownerName"
          component={StyledInput}
          label="Owner Name *"
          placeholder="Enter owner name"
        />
        <FormField
          control={control}
          name="owner.ownerType"
          component={SelectField}
          label="Owner Type *"
          options={OWNER_TYPES}
          placeholder="Select owner type"
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
    </>
  );
}

// Under a disabled Save button: what's missing (+ a way to reveal the collapsed Owner Details), or —
// when `unchanged` (EditProfile) — that there's nothing new to save.
export function ProfileSaveHint({ missing, ownerFieldsMissing, ownerOpen, onOpenOwner, invalid, unchanged }) {
  const { colors } = useTheme();
  if (!invalid && !unchanged) return null;

  return (
    <View style={{ alignItems: "center", marginTop: 10 }}>
      <Text className="text-sm text-center" style={{ color: colors.textMuted }}>
        {invalid
          ? missing.length > 0
            ? `To save, fill in: ${missing.join(", ")}`
            : "Fix the highlighted fields to save."
          : "No changes to save."}
      </Text>
      {invalid && ownerFieldsMissing && !ownerOpen ? (
        <TextLink onPress={onOpenOwner}>
          <Text className="text-sm font-medium" style={{ color: colors.text }}>
            Open Owner Details
          </Text>
        </TextLink>
      ) : null}
    </View>
  );
}
