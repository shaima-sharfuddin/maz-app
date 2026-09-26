import { View, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import ScreenTitle from "../components/ScreenTitle";
import { useTheme } from "../theme/ThemeContext";

export default function WelcomeScreen({ navigation }) {
  const { colors } = useTheme();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* ScrollView so the content never clips on small phones or with large accessibility text. */}
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center px-6 pt-8 pb-10">
          <Image
            source={require("../assets/images/maz-logo-wordmark.png")}
            style={{ width: 220, height: 55, marginBottom: 40 }}
            resizeMode="contain"
          />

          <ScreenTitle
            align="center"
            title="Welcome to MAZ"
            subtitle="Manage your office lease, meetings, and compliance — all in one place."
          />

          <AnimatedButton label="Get Started" onPress={() => navigation.navigate("SignUp")} />

          <View className="mt-4 w-full">
            <AnimatedButton
              label="Already have an account? Log in"
              variant="ghost"
              onPress={() => navigation.navigate("Login")}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
