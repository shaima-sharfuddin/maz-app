import { useState } from "react";
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import AnimatedButton from "../components/AnimatedButton";
import StyledInput from "../components/StyledInput";

type Props = NativeStackScreenProps<RootStackParamList, "SignUp">;

export default function SignUpScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <SafeAreaView className="flex-1 bg-navyDark">
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8">
            <Pressable onPress={() => navigation.goBack()} className="mb-6">
              <Text className="text-slate-300 text-base">{"\u2190"} Back</Text>
            </Pressable>

            <Text className="text-white text-2xl font-bold mb-1">Create your account</Text>
            <Text className="text-slate-400 text-base mb-8">
              Just a few details to get started.
            </Text>

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

            <Pressable className="mt-5 items-center" onPress={() => navigation.navigate("Login")}>
              <Text className="text-slate-400 text-sm">
                Already have an account? <Text className="text-white font-medium">Log in</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}