import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import StyledInput from "../components/StyledInput";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import TextLink from "../components/TextLink";
import { useTheme } from "../theme/ThemeContext";

export default function SignUpScreen({ navigation }) {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-10">
            <BackButton onPress={() => navigation.goBack()} />

            <ScreenTitle title="Create your account" subtitle="Just a few details to get started." />

            <StyledInput
              label="Full name"
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
            />

            <StyledInput
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <StyledInput
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+973 3xxx xxxx"
              keyboardType="phone-pad"
            />

            <View className="mt-4">
              <AnimatedButton label="Continue" />
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
