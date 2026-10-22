import { useEffect } from "react";
import { View, Text } from "react-native";
import { useController, useWatch } from "react-hook-form";
import FormField from "./FormField";
import SelectField from "./SelectField";
import SegmentedControl from "./SegmentedControl";
import StyledInput from "./StyledInput";
import FieldError from "./FieldError";
import { GCC_NATIONALITIES, GENDER_OPTIONS, ID_TYPE_OPTIONS } from "../data/formOptions";
import InfoNote from "./InfoNote";
import TextLink from "./TextLink";
import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRY_OPTIONS, findCountry, flagOf } from "../data/countryCodes";
import { useTheme } from "../theme/ThemeContext";

// The account fields collected at New User sign-up (rules: newUserSignUpSchema in validation/schemas.js):
// Company Name, Customer Name, Activities (sign-up only — not on EditProfile), Email, Password + Confirm (sign-up only), Mobile Number (country code + number),
// Remarks (optional, sign-up only), Nationality, an ID — CPR Number or Passport Number, the user's choice whatever
// their nationality — then Gender.
// Shared by NewUserSignUp (one group per step) and EditProfile (all at once) so the two never drift.

export const EMPTY_ACCOUNT_DETAILS = {
  companyName: "",
  customerName: "",
  gender: "", // MAZ GENDER code ("m" / "f")
  activities: [], // one or more activity labels
  email: "",
  password: "",
  confirmPassword: "",
  phoneCountry: DEFAULT_PHONE_COUNTRY, // ISO code of the dial code; any country can be picked
  phoneNumber: "",
  nationality: "",
  idType: "", // "cpr" | "passport" — which ID the user gives
  cprNumber: "",
  passportNumber: "",
  remarks: "",
};

// Only one ID field applies: switching the ID type clears the one that no longer does, so a stale
// CPR / passport number is never sent. `control` / `setValue` are react-hook-form's.
export function useIdentityFields(control, setValue) {
  const idType = useWatch({ control, name: "idType" });
  const isCpr = idType === "cpr";
  useEffect(() => {
    if (!idType) return;
    setValue(isCpr ? "passportNumber" : "cprNumber", "", { shouldValidate: true });
  }, [idType, isCpr, setValue]);
  return { idType, isCpr };
}

export function CompanyFields({ control }) {
  return (
    <>
      <FormField
        control={control}
        name="companyName"
        component={StyledInput}
        label="Company Name"
        placeholder="Enter company name"
        autoComplete="organization"
      />
      <FormField
        control={control}
        name="customerName"
        component={StyledInput}
        label="Customer Name"
        placeholder="Enter your full name"
        autoComplete="name"
      />
    </>
  );
}

// Gender — sign-up only: MAZ's GENDER codes ("m" Male / "f" Female), stored as the code.
export function GenderField({ control }) {
  return <FormField control={control} name="gender" component={SegmentedControl} label="Gender" options={GENDER_OPTIONS} />;
}

// Business activities — sign-up only (NOT part of CompanyFields, so EditProfile doesn't show it). One or more choices
// (no limit) from `options` (the screen loads them via fetchActivityOptions: MAZ's GET /activities labels — 165, so the sheet gets
// a search box — or the SAMPLE list if that failed). The field is shown at once — never a loading placeholder.
// `sample`: MAZ's list couldn't be loaded — say so, and offer `onRetry`.
export function ActivityField({ control, options, sample = false, onRetry }) {
  const { colors } = useTheme();
  return (
    <>
      <FormField
        control={control}
        name="activities"
        component={SelectField}
        multiple
        label="Activities"
        options={options}
        placeholder="Select one or more activities"
      />
      {sample ? (
        <View style={{ marginTop: -12, marginBottom: 20 }}>
          <InfoNote>Showing sample activities — MAZ&apos;s activity list couldn&apos;t be loaded.</InfoNote>
          {onRetry ? (
            <TextLink align="left" onPress={onRetry}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>Try again</Text>
            </TextLink>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

// `readOnly` (EditProfile): the email is the verified sign-in address, so it's shown but can't be edited here.
export function EmailField({ control, readOnly = false }) {
  const { colors } = useTheme();
  return (
    <>
      <FormField
        control={control}
        name="email"
        component={StyledInput}
        label="Email Address"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        editable={!readOnly}
        style={readOnly ? { color: colors.textMuted } : undefined}
      />
      {readOnly ? (
        <Text style={{ color: colors.textSubtle, fontSize: 12, lineHeight: 16, marginTop: -12, marginBottom: 20 }}>
          Your verified sign-in email. Contact MAZ to change it.
        </Text>
      ) : null}
    </>
  );
}

// Password + Confirm password for a MAZ login: sign-up (rules: newUserSignUpSchema — never shown on Review) and
// ResetPassword (label "New Password"; resetPasswordSchema).
export function PasswordFields({ control, label = "Password" }) {
  return (
    <>
      <FormField
        control={control}
        name="password"
        component={StyledInput}
        label={label}
        placeholder="At least 8 characters, a letter and a number"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
      />
      <FormField
        control={control}
        name="confirmPassword"
        component={StyledInput}
        label={`Confirm ${label}`}
        placeholder="Enter your password again"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
      />
    </>
  );
}

// Mobile Number: a searchable country-code picker (flag + dial code shown beside the number) and the number itself.
// One label and one error line for the pair; the number is validated for the chosen country (mobileNumberIssue).
export function MobileNumberField({ control }) {
  const { colors } = useTheme();
  const country = useController({ control, name: "phoneCountry" });
  const number = useController({ control, name: "phoneNumber" });
  const error = country.fieldState.error?.message ?? number.fieldState.error?.message;
  const selected = findCountry(country.field.value);

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>Mobile Number</Text>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <SelectField
          compact
          label="Country code"
          placeholder="Code"
          options={PHONE_COUNTRY_OPTIONS}
          value={country.field.value}
          onChange={(iso) => {
            country.field.onChange(iso);
            // Re-check the number against the new country's rules once one has been typed.
            if (number.field.value) number.field.onBlur();
          }}
          onBlur={country.field.onBlur}
          formatSelected={(iso) => `${flagOf(iso)} ${findCountry(iso)?.dial ?? ""}`}
          error={country.fieldState.error?.message}
        />
        {/* StyledInput keeps its own 20pt bottom margin; this field's wrapper provides it instead. */}
        <View style={{ flex: 1, marginBottom: -20 }}>
          <StyledInput
            value={number.field.value}
            onChangeText={number.field.onChange}
            onBlur={number.field.onBlur}
            accessibilityLabel={`Mobile number${selected ? `, ${selected.dial}` : ""}`}
            placeholder="Mobile number"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel-national"
            maxLength={20}
            style={number.fieldState.error ? { borderColor: colors.danger } : undefined}
          />
        </View>
      </View>
      <FieldError message={error} />
    </View>
  );
}

// Remarks — optional, multiline, sign-up only (sent as the enquiry's `remarks` when enquiries are switched on).
export function RemarksField({ control }) {
  return (
    <FormField
      control={control}
      name="remarks"
      component={StyledInput}
      label="Remarks (optional)"
      placeholder="Anything you'd like MAZ to know — e.g. team size or preferred start date"
      multiline
      numberOfLines={4}
      maxLength={500}
      textAlignVertical="top"
      style={{ minHeight: 104 }}
    />
  );
}

// Nationality, then the ID the user chooses to give (CPR or passport — any nationality may give either), then Gender.
export function IdentificationFields({ control, idType }) {
  return (
    <>
      <FormField
        control={control}
        name="nationality"
        component={SelectField}
        label="Nationality"
        options={GCC_NATIONALITIES}
        placeholder="Select nationality"
      />
      <FormField control={control} name="idType" component={SegmentedControl} label="ID type" options={ID_TYPE_OPTIONS} />
      {idType ? (
        idType === "cpr" ? (
          <FormField
            key="cprNumber"
            control={control}
            name="cprNumber"
            component={StyledInput}
            label="CPR Number"
            placeholder="9-digit CPR number"
            keyboardType="number-pad"
            maxLength={9}
            revealable
          />
        ) : (
          <FormField
            key="passportNumber"
            control={control}
            name="passportNumber"
            component={StyledInput}
            label="Passport Number"
            placeholder="Enter passport number"
            autoCapitalize="characters"
            revealable
          />
        )
      ) : null}
      <GenderField control={control} />
    </>
  );
}
