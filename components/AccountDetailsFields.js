import { useEffect } from "react";
import { View, Text } from "react-native";
import { useController, useWatch } from "react-hook-form";
import FormField from "./FormField";
import SelectField from "./SelectField";
import StyledInput from "./StyledInput";
import FieldError from "./FieldError";
import { BAHRAIN, GCC_NATIONALITIES } from "../data/formOptions";
import InfoNote from "./InfoNote";
import TextLink from "./TextLink";
import { Skeleton } from "./Skeleton";
import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRY_OPTIONS, findCountry, flagOf } from "../data/countryCodes";
import { useTheme } from "../theme/ThemeContext";

// The account fields collected at New User sign-up (rules: newUserSignUpSchema in validation/schemas.js):
// Company Name, Customer Name, Activity (sign-up only — not on EditProfile), Email, Mobile Number (country code + number),
// Remarks (optional, sign-up only), Nationality, then CPR Number (Bahrain) or Passport Number (others).
// Shared by NewUserSignUp (one group per step) and EditProfile (all at once) so the two never drift.

export const EMPTY_ACCOUNT_DETAILS = {
  companyName: "",
  customerName: "",
  activity: "",
  email: "",
  phoneCountry: DEFAULT_PHONE_COUNTRY, // ISO code of the dial code; any country can be picked
  phoneNumber: "",
  nationality: "",
  cprNumber: "",
  passportNumber: "",
  remarks: "",
};

// Only one ID field applies: switching nationality clears the one that no longer does, so a stale
// CPR / passport number is never sent. `control` / `setValue` are react-hook-form's.
export function useIdentityFields(control, setValue) {
  const nationality = useWatch({ control, name: "nationality" });
  const isBahraini = nationality === BAHRAIN;
  useEffect(() => {
    if (!nationality) return;
    setValue(isBahraini ? "passportNumber" : "cprNumber", "", { shouldValidate: true });
  }, [nationality, isBahraini, setValue]);
  return { nationality, isBahraini };
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

// Business activity — sign-up only (NOT part of CompanyFields, so EditProfile doesn't show it). One choice from
// `options` (the screen loads them via fetchActivityOptions: MAZ's GET /activities labels — 165, so the sheet gets
// a search box — or the SAMPLE list if that failed). `loading`: a placeholder until the options arrive.
// `sample`: MAZ's list couldn't be loaded — say so, and offer `onRetry`.
export function ActivityField({ control, options, loading = false, sample = false, onRetry }) {
  const { colors } = useTheme();
  if (loading) {
    return (
      <View style={{ marginBottom: 20 }} accessibilityLabel="Loading activities">
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>Activity</Text>
        <Skeleton width="100%" height={48} radius={12} />
      </View>
    );
  }
  return (
    <>
      <FormField
        control={control}
        name="activity"
        component={SelectField}
        label="Activity"
        options={options}
        placeholder="Select business activity"
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

export function IdentificationFields({ control, nationality, isBahraini }) {
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
      {nationality ? (
        isBahraini ? (
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
    </>
  );
}
