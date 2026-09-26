import { View, Text, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AnimatedButton from "../components/AnimatedButton";

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView className="flex-1 bg-navyDark">
      <StatusBar style="light" />
      <View className="flex-1 items-center justify-center px-6">
        <Image
          source={require("../assets/images/maz-logo-wordmark.png")}
          style={{ width: 220, height: 55, marginBottom: 40 }}
          resizeMode="contain"
        />

        <Text className="text-white text-2xl font-bold mb-2 text-center">
          Welcome to MAZ
        </Text>

        <Text className="text-slate-300 text-base text-center mb-10 leading-6">
          Manage your office lease, meetings, and compliance — all in one place.
        </Text>

        <AnimatedButton label="Get Started" onPress={() => navigation.navigate("SignUp")} />

        <View className="mt-4">
          <AnimatedButton
            label="Already have an account? Log in"
            variant="ghost"
            onPress={() => navigation.navigate("Login")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}