import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import DocumentSheet from "../components/DocumentSheet";
import IconBadge from "../components/IconBadge";
import { formatBHD } from "../data/pricing";
import { formatDate } from "../utils/formatDate";
import { useTheme } from "../theme/ThemeContext";
import { TYPE } from "../theme/theme";
import FadeIn from "../components/FadeIn";
import { homeRoute } from "../utils/navigation";

// Payment Successful — shown after every (mock) payment: an office request's invoice ({ requestId }) or a
// contract's outstanding balance ({ contractId }). receipt: { receipt, amount, paidDate, method, requestId |
// contractId, unit, bills }. Stack: dashboard → RequestStatus / ContractDetail → here.
// "View invoice" → RequestInvoice (request) or BillViewer (the paid bill; ContractDetail's bills list when
// several were paid at once) — both offer "Download invoice (PDF)".
// Existing User payments come from services/paymentService.js; while they're DEMO (receipt.demo) the screen says
// so: no money charged, not an official MAZ receipt or tax invoice. A demo payment can cover several contracts
// (dashboard "Pay now") — then the stack is dashboard → here, and contractIds lists them.
export default function PaymentReceiptScreen({ navigation, route }) {
  const { colors } = useTheme();
  const receipt = route.params?.receipt;
  const paidBills = receipt?.bills ?? [];

  const viewInvoice = () => {
    if (receipt.requestId) {
      navigation.navigate("RequestInvoice", { requestId: receipt.requestId });
    } else if (paidBills.length === 1) {
      navigation.navigate("BillViewer", { contractId: receipt.contractId, billNumber: paidBills[0] });
    } else {
      navigation.goBack(); // ContractDetail (or the dashboard, for several contracts) — each bill opens BillViewer
    }
  };

  const rows = receipt
    ? [
        { label: "Receipt no.", value: receipt.receipt },
        { label: "Date", value: formatDate(receipt.paidDate) },
        { label: "Payment method", value: receipt.method },
        receipt.requestId
          ? { label: "Request", value: receipt.requestId }
          : {
              label: (receipt.contractIds?.length ?? 1) > 1 ? "Contracts" : "Contract",
              value: receipt.contractIds?.join(", ") ?? receipt.contractId,
            },
        ...(receipt.unit ? [{ label: "Unit", value: receipt.unit }] : []),
        {
          label: receipt.requestId ? "Invoice" : receipt.bills.length === 1 ? "Bill" : "Bills",
          value: receipt.bills.join(", "),
        },
      ]
    : [];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-12 pb-10">
          {/* A receipt ticket: the confirmation is its header, the details sit below the tear line. */}
          <FadeIn offset={16}>
            <DocumentSheet
              style={{ marginBottom: 12 }}
              header={
                <View style={{ alignItems: "center", paddingTop: 8 }}>
                  {/* Success: the badge settles in, then the message and the amount follow. */}
                  <IconBadge icon="checkmark" size={72} tone="success" animate style={{ marginBottom: 18 }} />
                  <FadeIn delay={200} style={{ alignItems: "center", alignSelf: "stretch" }}>
                    <Text style={[TYPE.sectionTitle, { color: colors.text, textAlign: "center", marginBottom: 12 }]}>
                      Payment successful
                    </Text>
                    {receipt ? (
                      <Text
                        style={[TYPE.amountDisplay, { color: colors.text, marginBottom: 10 }]}
                        adjustsFontSizeToFit
                        numberOfLines={1}
                      >
                        {formatBHD(receipt.amount)}
                      </Text>
                    ) : null}
                    <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center" }}>
                      {receipt ? `Your payment of ${formatBHD(receipt.amount)} has been received.` : "Your payment has been received."}{" "}
                      {receipt?.requestId
                        ? "MAZ will now prepare your contract."
                        : receipt?.demo
                          ? "The bills you paid now show as Paid (demo) for this app session."
                          : "Your balance is now settled."}
                    </Text>
                  </FadeIn>
                </View>
              }
              sections={rows.length > 0 ? [{ key: "receipt", title: "Receipt details", rows }] : []}
            />
          </FadeIn>

          <FadeIn delay={320}>

            <Text style={[TYPE.caption, { color: colors.textSubtle, textAlign: "center", marginBottom: 28 }]}>
              {receipt?.demo
                ? "DEMO / TEST payment — no money was charged and nothing was sent to MAZ. Not an official MAZ receipt or tax invoice."
                : "Demo receipt — no money was charged."}
            </Text>

            {receipt ? (
              <AnimatedButton label={paidBills.length > 1 ? "View invoices" : "View invoice"} onPress={viewInvoice} />
            ) : null}
            <View style={{ marginTop: 8 }}>
              <AnimatedButton
                label={receipt?.requestId ? "Back to request" : receipt?.contractId ? "Back to contract" : "Back to dashboard"}
                variant="ghost"
                onPress={() => navigation.goBack()}
              />
            </View>
            <View style={{ marginTop: 8 }}>
              <AnimatedButton
                label="Go to dashboard"
                variant="ghost"
                onPress={() => navigation.reset({ index: 0, routes: [homeRoute()] })}
              />
            </View>
          </FadeIn>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
