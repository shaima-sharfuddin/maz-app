import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import { PAYMENTS_ARE_DEMO } from "../services/api";
import { formatBHD } from "../data/pricing";
import { useTheme } from "../theme/ThemeContext";
import { TYPE } from "../theme/theme";
import FadeIn from "../components/FadeIn";
import IconBadge from "../components/IconBadge";
import DocumentSheet from "../components/DocumentSheet";
import { goHome } from "../utils/navigation";

// Payment Review → (payment declined) → here. { amount, message } from paymentService.submitPayment's failed result.
// "Try again" goes back to the review (still on the stack) so the tester can change the method / outcome.
export default function PaymentFailedScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { amount, message } = route.params ?? {};

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.canvas }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-12 pb-10">
          <FadeIn offset={16}>
            <DocumentSheet
              style={{ marginBottom: 20 }}
              header={
                <View style={{ alignItems: "center", paddingTop: 8 }}>
                  <IconBadge icon="close" size={72} tone="danger" animate style={{ marginBottom: 18 }} />
                  <FadeIn delay={200} style={{ alignItems: "center", alignSelf: "stretch" }}>
                    <Text style={[TYPE.sectionTitle, { color: colors.text, textAlign: "center", marginBottom: 12 }]}>
                      Payment failed
                    </Text>
                    {amount ? (
                      <Text
                        style={[TYPE.amountDisplay, { color: colors.textSecondary, marginBottom: 8 }]}
                        adjustsFontSizeToFit
                        numberOfLines={1}
                      >
                        {formatBHD(amount)}
                      </Text>
                    ) : null}
                    <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center" }}>
                      {message || "Your payment didn't go through. No money was charged."}
                    </Text>
                  </FadeIn>
                </View>
              }
            />
          </FadeIn>

          {PAYMENTS_ARE_DEMO ? (
            <Text style={[TYPE.caption, { color: colors.textSubtle, textAlign: "center", marginBottom: 28 }]}>
              DEMO / TEST — no money was charged and nothing was sent to MAZ.
            </Text>
          ) : null}

          <AnimatedButton label="Try again" onPress={() => navigation.goBack()} />
          <View style={{ marginTop: 8 }}>
            <AnimatedButton label="Back to dashboard" variant="ghost" onPress={() => goHome(navigation)} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
