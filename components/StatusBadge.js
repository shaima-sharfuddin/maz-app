import { View, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";

const LABELS = { active: "Active", expired: "Expired", due: "Due", paid: "Paid", upcoming: "Upcoming" };

// Small status pill for contracts and bills.
export default function StatusBadge({ status }) {
  const { colors } = useTheme();

  const styles = {
    active: { color: colors.success, backgroundColor: colors.successSoft, borderColor: colors.successSoft },
    paid: { color: colors.success, backgroundColor: colors.successSoft, borderColor: colors.successSoft },
    // danger (not brand crimson) keeps "Due" legible on the dark background
    due: { color: colors.danger, backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft },
    expired: { color: colors.textMuted, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
    upcoming: { color: colors.textMuted, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
  }[status] ?? { color: colors.textMuted, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder };

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
