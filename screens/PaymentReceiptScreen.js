import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AnimatedButton from "../components/AnimatedButton";
import { formatBHD } from "../data/pricing";
import { formatDate } from "../utils/formatDate";
import { useTheme } from "../theme/ThemeContext";

// Confirmation after a (mock) payment. receipt: { receipt, amount, paidDate, method, contractId, unit, bills }
export default function PaymentReceiptScreen({ navigation, route }) {
  const { colors } = useTheme();
  const receipt = route.params?.receipt;

  const rows = receipt
    ? [
        { label: "Receipt no.", value: receipt.receipt },
        { label: "Date", value: formatDate(receipt.paidDate) },
        { label: "Payment method", value: receipt.method },
        { label: "Contract", value: receipt.contractId },
        { label: "Unit", value: receipt.unit },
        { label: receipt.bills.length === 1 ? "Bill" : "Bills", value: receipt.bills.join(", ") },
      ]
    : [];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-16 pb-10">
          <View style={{ alignItems: "center", marginBottom: 28 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: colors.successSoft,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <Ionicons name="checkmark" size={36} color={colors.success} />
            </View>
            <Text className="text-2xl font-bold text-center mb-2" style={{ color: colors.text }}>
              Payment successful
            </Text>
            {receipt ? (
              <Text style={{ color: colors.text, fontSize: 32, fontWeight: "700", marginBottom: 6 }}>
                {formatBHD(receipt.amount)}
              </Text>
            ) : null}
            <Text className="text-base leading-6 text-center" style={{ color: colors.textMuted }}>
              Your balance is now settled. Keep this receipt for your records.
            </Text>
          </View>

          {rows.length > 0 ? (
            <View
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.surfaceBorder,
                borderRadius: 16,
                paddingHorizontal: 20,
                paddingVertical: 6,
                marginBottom: 12,
              }}
            >
              {rows.map((row, index) => (
                <View
                  key={row.label}
                  style={{
                    flexDirection: "row",
                    paddingVertical: 12,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.surfaceBorder,
                  }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 14, marginRight: 12 }}>{row.label}</Text>
                  <Text style={{ flex: 1, textAlign: "right", color: colors.text, fontSize: 14, fontWeight: "500" }}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={{ color: colors.textSubtle, fontSize: 12, textAlign: "center", marginBottom: 28 }}>
            Demo receipt — no money was charged.
          </Text>

          <AnimatedButton label="Back to contract" onPress={() => navigation.goBack()} />
          <View style={{ marginTop: 8 }}>
            <AnimatedButton
              label="Go to dashboard"
              variant="ghost"
              onPress={() => navigation.reset({ index: 0, routes: [{ name: "HomeDashboard" }] })}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
