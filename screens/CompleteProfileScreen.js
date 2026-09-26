import { useState } from "react";
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AnimatedButton from "../components/AnimatedButton";
import StyledInput from "../components/StyledInput";
import SectionCard from "../components/SectionCard";
import DateField from "../components/DateField";
import SelectField from "../components/SelectField";
import SegmentedControl from "../components/SegmentedControl";
import { COMPANIES, GENDERS, NATIONALITIES } from "../data/formOptions";

// Field set mirrors MAZ's admin "Create Customer" form.
export default function CompleteProfileScreen({ navigation }) {
  const [customer, setCustomer] = useState({
    company: "",
    customerName: "",
    vatNumber: "",
    vatRegistrationDate: null,
    crNumber: "",
    crRegistrationDate: null,
    address: "",
  });
  const [owner, setOwner] = useState({
    ownerName: "",
    ownerMobile: "",
    email: "",
    cprNumber: "",
    cprExpiryDate: null,
    passportNumber: "",
    passportExpiryDate: null,
    nationality: "",
    gender: "",
  });
  const [error, setError] = useState("");

  const updateCustomer = (field) => (value) => setCustomer((prev) => ({ ...prev, [field]: value }));
  const updateOwner = (field) => (value) => setOwner((prev) => ({ ...prev, [field]: value }));

  const today = new Date();

  const handleSave = () => {
    const missing = [];
    if (!customer.customerName.trim()) missing.push("Customer Name");
    if (!owner.ownerName.trim()) missing.push("Owner Name");
    if (!owner.gender) missing.push("Gender");

    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(", ")}`);
      return;
    }
    // DEMO ONLY — nothing is persisted. Replace with the Create Customer API call
    // (submitting { customer, owner }) once the backend is available.
    // reset() makes the dashboard the only route, so back can't return to this form.
    navigation.reset({
      index: 0,
      routes: [{ name: "HomeDashboard", params: { ownerName: owner.ownerName.trim(), profileSaved: true } }],
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-navyDark">
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-10">
            <Pressable onPress={() => navigation.goBack()} className="mb-6">
              <Text className="text-slate-300 text-base">{"←"} Back</Text>
            </Pressable>

            <Text className="text-white text-2xl font-bold mb-1">Complete your profile</Text>
            <Text className="text-slate-400 text-base mb-8">
              Tell us about your company and its owner. Fields marked * are required.
            </Text>

            <SectionCard title="Company Details" defaultExpanded>
              <SelectField
                label="Company"
                value={customer.company}
                onChange={updateCustomer("company")}
                options={COMPANIES}
                placeholder="Select company"
              />
              <StyledInput
                label="Customer Name *"
                value={customer.customerName}
                onChangeText={updateCustomer("customerName")}
                placeholder="Enter customer name"
              />
              <StyledInput
                label="VAT Number"
                value={customer.vatNumber}
                onChangeText={updateCustomer("vatNumber")}
                placeholder="Enter VAT number"
                autoCapitalize="characters"
              />
              <DateField
                label="VAT Registration Date"
                value={customer.vatRegistrationDate}
                onChange={updateCustomer("vatRegistrationDate")}
                maximumDate={today}
              />
              <StyledInput
                label="CR Number"
                value={customer.crNumber}
                onChangeText={updateCustomer("crNumber")}
                placeholder="e.g. 123456-1"
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
              />
              <DateField
                label="CR Registration Date"
                value={customer.crRegistrationDate}
                onChange={updateCustomer("crRegistrationDate")}
                maximumDate={today}
              />
              <StyledInput
                label="Address"
                value={customer.address}
                onChangeText={updateCustomer("address")}
                placeholder="Flat, building, road, block, area"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{ minHeight: 88 }}
              />
            </SectionCard>

            <SectionCard title="Owner Details" defaultExpanded={false}>
              <StyledInput
                label="Owner Name *"
                value={owner.ownerName}
                onChangeText={updateOwner("ownerName")}
                placeholder="Enter owner name"
              />
              <StyledInput
                label="Owner Mobile"
                value={owner.ownerMobile}
                onChangeText={updateOwner("ownerMobile")}
                placeholder="+973 3xxx xxxx"
                keyboardType="phone-pad"
              />
              <StyledInput
                label="Email Address"
                value={owner.email}
                onChangeText={updateOwner("email")}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <StyledInput
                label="CPR Number"
                value={owner.cprNumber}
                onChangeText={updateOwner("cprNumber")}
                placeholder="9-digit CPR number"
                keyboardType="number-pad"
                maxLength={9}
              />
              <DateField
                label="CPR Expiry Date"
                value={owner.cprExpiryDate}
                onChange={updateOwner("cprExpiryDate")}
              />
              <StyledInput
                label="Passport Number"
                value={owner.passportNumber}
                onChangeText={updateOwner("passportNumber")}
                placeholder="Enter passport number"
                autoCapitalize="characters"
              />
              <DateField
                label="Passport Expiry Date"
                value={owner.passportExpiryDate}
                onChange={updateOwner("passportExpiryDate")}
              />
              <SelectField
                label="Nationality"
                value={owner.nationality}
                onChange={updateOwner("nationality")}
                options={NATIONALITIES}
                placeholder="Select nationality"
              />
              <SegmentedControl
                label="Gender *"
                value={owner.gender}
                onChange={updateOwner("gender")}
                options={GENDERS}
              />
            </SectionCard>

            <View className="mt-4">
              <AnimatedButton label="Save profile" onPress={handleSave} />
              {error ? <Text className="text-red-400 text-sm text-center mt-3">{error}</Text> : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
