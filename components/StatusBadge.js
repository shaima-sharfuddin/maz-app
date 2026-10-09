import { View, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { TYPE } from "../theme/theme";

// Contract statuses (draft … terminated) come from CONTRACT_STATUS in data/enums.js via apiMappers.
const LABELS = {
  draft: "Draft",
  reviewing: "Reviewing",
  active: "Active",
  expired: "Expired",
  renewed: "Renewed",
  terminated: "Terminated",
  due: "Due",
  paid: "Paid",
  paidDemo: "Paid (demo)", // a bill paid with a DEMO payment this session (services/mock/demoPaymentLedger.js)
  unpaid: "Unpaid",
  upcoming: "Upcoming",
  open: "Open",
  resolved: "Resolved",
  answered: "Answered",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  requested: "Requested",
  approved: "Approved",
  demo: "Demo data", // marks a mock record (e.g. a demo violation) — never real MAZ data
};

// Small status pill for contracts, bills, enquiries, bookings and violations.
// Renders nothing when status is unknown (null), e.g. real API bills whose paid / due state is unconfirmed.
export default function StatusBadge({ status }) {
  const { colors } = useTheme();
  if (!status) return null;

  const success = { color: colors.success, backgroundColor: colors.successSoft };
  // danger (not brand crimson) keeps "Due" / "Open" legible on the dark background
  const danger = { color: colors.danger, backgroundColor: colors.dangerSoft };
  const warning = { color: colors.warning, backgroundColor: colors.warningSoft };
  const muted = { color: colors.textMuted, backgroundColor: colors.inputBackground, borderColor: colors.surfaceBorder };

  const styles =
    {
      active: success,
      renewed: success,
      paid: success,
      paidDemo: success,
      resolved: success,
      answered: success,
      confirmed: success,
      approved: success,
      due: danger,
      unpaid: danger,
      open: danger,
      reviewing: warning,
    }[status] ?? muted; // draft, expired, terminated, upcoming, cancelled, requested

  // A soft pill with a status dot: the colour carries the meaning, the label stays calm (sentence case).
  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: 8,
        paddingRight: 10,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor ?? styles.backgroundColor,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: styles.color, marginRight: 6 }} />
      <Text style={[TYPE.status, { color: styles.color }]}>{LABELS[status] ?? status}</Text>
    </View>
  );
}
