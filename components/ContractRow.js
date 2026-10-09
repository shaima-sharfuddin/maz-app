import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "./PressableScale";
import StatusBadge from "./StatusBadge";
import { formatBHD } from "../data/pricing";
import { formatDate, formatMonth } from "../utils/formatDate";
import { unitWithLocation } from "../utils/formatUnit";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";
import { RADIUS, TYPE } from "../theme/theme";

// Uses only what's known: real API contracts have no payment data yet, so they fall through to their term dates.
export function contractCaption(contract) {
  if (contract.status === "expired") return `Contract ${contract.id} · Ended ${formatDate(contract.endDate)}`;
  if (contract.outstanding > 0) return `Contract ${contract.id} · ${formatBHD(contract.outstanding)} due`;
  if (contract.renewal) return `Contract ${contract.id} · Renewal requested`;
  // Confirmed 10-day window (services/expiryService.js) on the real end date.
  if (contract.expiry?.state === "expiring") {
    const days = contract.expiry.daysLeft;
    return `Contract ${contract.id} · ${days === 0 ? "Expires today" : `Expires in ${days} ${days === 1 ? "day" : "days"}`}`;
  }
  if (contract.paidThrough) return `Contract ${contract.id} · Paid through ${formatMonth(contract.paidThrough)}`;
  if (contract.startDate && contract.endDate) {
    return `Contract ${contract.id} · ${formatDate(contract.startDate)} – ${formatDate(contract.endDate)}`;
  }
  return `Contract ${contract.id}`;
}

// A contract as a document card: header (contract number + status), the unit as the title, and a footer strip
// with the term (contractCaption without its repeated "Contract {id} · " prefix). Dashboard + Contract List.
export default function ContractRow({ contract, onPress }) {
  const { colors } = useTheme();
  const card = useCardStyle();
  const title = unitWithLocation(contract.unit, contract.location);
  const caption = contractCaption(contract);
  const prefix = `Contract ${contract.id} · `;
  const detail = caption.startsWith(prefix) ? caption.slice(prefix.length) : null;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={[title, contract.statusLabel ?? contract.status, caption].filter(Boolean).join(", ")}
      containerStyle={{ marginBottom: 14 }}
      style={card}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", padding: 16, paddingBottom: 14 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: RADIUS.md,
            backgroundColor: colors.hero,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
          }}
        >
          <Ionicons name="document-text-outline" size={22} color={colors.onHero} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[TYPE.overline, { color: colors.textMuted, marginBottom: 3 }]}>Contract</Text>
          <Text
            style={{ color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: "700", fontVariant: ["tabular-nums"] }}
          >
            {contract.id}
          </Text>
          <Text style={[TYPE.cardTitle, { color: colors.text, fontSize: 17, marginTop: 6 }]}>{title}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 6, marginLeft: 8 }}>
          <StatusBadge status={contract.status} />
          {contract.demo ? <StatusBadge status="demo" /> : null}
        </View>
      </View>
      {detail ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: colors.surfaceMuted,
            borderTopWidth: 1,
            borderTopColor: colors.divider,
            borderBottomLeftRadius: RADIUS.card - 1,
            borderBottomRightRadius: RADIUS.card - 1,
          }}
        >
          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} style={{ marginRight: 8 }} />
          <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
            {detail}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
        </View>
      ) : null}
    </PressableScale>
  );
}
