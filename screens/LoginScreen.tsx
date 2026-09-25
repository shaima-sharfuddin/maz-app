import { useState } from "react";
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import AnimatedButton from "../components/AnimatedButton";
import StyledInput from "../components/StyledInput";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <SafeAreaView className="flex-1 bg-navyDark">
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8">
            <Pressable onPress={() => navigation.goBack()} className="mb-6">
              <Text className="text-slate-300 text-base">{"\u2190"} Back</Text>
            </Pressable>

            <Text className="text-white text-2xl font-bold mb-1">Welcome back</Text>
            <Text className="text-slate-400 text-base mb-8">Log in to your MAZ account.</Text>

            <StyledInput
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <StyledInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
            />

            <Pressable className="items-end mb-6">
              <Text className="text-slate-400 text-sm">Forgot password?</Text>
            </Pressable>

            <AnimatedButton label="Log in" />

            <Pressable className="mt-5 items-center" onPress={() => navigation.navigate("SignUp")}>
              <Text className="text-slate-400 text-sm">
                Don't have an account? <Text className="text-white font-medium">Sign up</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}