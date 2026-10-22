import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import EmptyState from "../components/EmptyState";
import FadeIn from "../components/FadeIn";
import InfoNote from "../components/InfoNote";
import PressableScale from "../components/PressableScale";
import ScreenTitle from "../components/ScreenTitle";
import SegmentedControl from "../components/SegmentedControl";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import StatusBadge from "../components/StatusBadge";
import useAsync from "../hooks/useAsync";
import { fetchInvoices, errorMessage } from "../services/api";
import { DEMO_NOTES } from "../data/demoNotes";
import { formatBHD } from "../data/pricing";
import { formatDate } from "../utils/formatDate";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";
import { RADIUS, TYPE } from "../theme/theme";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
];

const EMPTY_MESSAGES = {
  all: { title: "No invoices yet", message: "Invoices for your office request and contracts will appear here." },
  unpaid: { title: "Nothing to pay", message: "You have no unpaid invoices." },
  paid: { title: "No paid invoices yet", message: "Invoices you've paid will appear here." },
};

const matches = (filter, invoice) =>
  filter === "all" ||
  (filter === "paid" ? invoice.status === "paid" || invoice.status === "paidDemo" : invoice.status === "unpaid");

// One invoice row inside the grouped list: navy icon tile, number + description / date, amount and Paid / Unpaid.
function InvoiceRow({ invoice, first, onPress }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`Invoice ${invoice.number}, ${invoice.title}, ${formatBHD(invoice.amount ?? 0)}${
        invoice.status ? `, ${invoice.status === "unpaid" ? "unpaid" : "paid"}` : ""
      }`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        minHeight: 72,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.divider,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: RADIUS.sm + 4,
          backgroundColor: colors.primarySoft,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Ionicons name={invoice.kind === "request" ? "receipt-outline" : "document-text-outline"} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1, marginRight: 10 }}>
        <Text style={[TYPE.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {invoice.number}
        </Text>
        <Text style={[TYPE.caption, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={1}>
          {invoice.title}
        </Text>
        <Text style={[TYPE.caption, { color: colors.textSubtle, marginTop: 1 }]} numberOfLines={1}>
          {invoice.date ? `${invoice.kind === "request" ? "Issued" : "Due"} ${formatDate(invoice.date)}` : "No date"}
          {invoice.demo ? " · Demo" : ""}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[TYPE.label, { color: colors.text, fontWeight: "700", fontVariant: ["tabular-nums"], marginBottom: 6 }]}>
          {typeof invoice.amount === "number" ? formatBHD(invoice.amount) : "—"}
        </Text>
        <StatusBadge status={invoice.status} />
      </View>
    </PressableScale>
  );
}

// Every invoice in one place (user, 2026-10-22): office request invoices (MOCK, sample pricing) and contract bills
// (REAL MAZ receipts, PROVISIONAL Paid / Unpaid) — services/invoiceService.js. A row opens the invoice
// (RequestInvoice) or bill (BillViewer), where Pay and the PDF download live. Reached from the dashboard's quick
// actions and the Account tab.
export default function InvoicesScreen({ navigation }) {
  const { colors } = useTheme();
  const card = useCardStyle();
  const [filter, setFilter] = useState("all");
  const { loading, data: invoices, error, reload } = useAsync(fetchInvoices);

  const renderList = () => {
    if (loading) {
      return (
        <SkeletonCard style={{ padding: 16 }}>
          {[0, 1, 2].map((key) => (
            <View key={key} style={{ flexDirection: "row", alignItems: "center", marginBottom: key < 2 ? 18 : 0 }}>
              <Skeleton width={40} height={40} radius={12} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Skeleton width="45%" height={14} style={{ marginBottom: 8 }} />
                <Skeleton width="70%" height={12} />
              </View>
              <Skeleton width={70} height={14} />
            </View>
          ))}
        </SkeletonCard>
      );
    }
    if (error) {
      return (
        <EmptyState icon="cloud-offline-outline" title="We couldn't load your invoices" message={errorMessage(error)}>
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }
    const shown = invoices.filter((invoice) => matches(filter, invoice));
    if (shown.length === 0) {
      const { title, message } = EMPTY_MESSAGES[filter];
      return (
        <EmptyState icon="receipt-outline" title={title} message={message}>
          {filter === "all" ? (
            <AnimatedButton label="Find an office" variant="secondary" onPress={() => navigation.navigate("BrowsePlans")} />
          ) : null}
        </EmptyState>
      );
    }
    return (
      <FadeIn>
        <View style={[card, { overflow: "hidden" }]}>
          {shown.map((invoice, index) => (
            <InvoiceRow
              key={invoice.key}
              invoice={invoice}
              first={index === 0}
              onPress={() => navigation.navigate(invoice.target.screen, invoice.target.params)}
            />
          ))}
        </View>
      </FadeIn>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.canvas }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />
          <ScreenTitle title="Invoices" subtitle="Every invoice for your office and contracts." />
          <SegmentedControl value={filter} onChange={setFilter} options={FILTERS} />
          {renderList()}
          {!loading && !error && invoices?.length ? (
            <InfoNote style={{ marginTop: 16 }}>{DEMO_NOTES.invoices}</InfoNote>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
