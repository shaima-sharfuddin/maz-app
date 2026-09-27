import { View, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";

const LABELS = {
  active: "Active",
  expired: "Expired",
  due: "Due",
  paid: "Paid",
  upcoming: "Upcoming",
  open: "Open",
  resolved: "Resolved",
  answered: "Answered",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  requested: "Requested",
};

// Small status pill for contracts, bills, enquiries, bookings and violations.
export default function StatusBadge({ status }) {
  const { colors } = useTheme();

  const success = { color: colors.success, backgroundColor: colors.successSoft, borderColor: colors.successSoft };
  // danger (not brand crimson) keeps "Due" / "Open" legible on the dark background
  const danger = { color: colors.danger, backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft };
  const muted = { color: colors.textMuted, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder };

  const styles =
    {
      active: success,
      paid: success,
      resolved: success,
      answered: success,
      confirmed: success,
      due: danger,
      open: danger,
    }[status] ?? muted; // expired, upcoming, cancelled, requested

  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
      }}
    >
      <Text style={{ color: styles.color, fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" }}>
        {LABELS[status] ?? status}
      </Text>
    </View>
  );
}
