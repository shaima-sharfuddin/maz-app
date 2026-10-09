import { View, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { TYPE } from "../theme/theme";

// Small uppercase label that opens a section ("Quick actions", "Your contracts" …), led by a crimson square from
// the MAZ wordmark (colors.highlight — one of crimson's few sanctioned uses). `style` is for spacing tweaks only (e.g. marginTop when it follows a card).
export default function SectionHeading({ children, style }) {
  const { colors } = useTheme();
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", marginBottom: 12 }, style]}>
      <View style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: colors.highlight, marginRight: 8 }} />
      <Text style={[TYPE.overline, { flex: 1, color: colors.accent }]}>{children}</Text>
    </View>
  );
}
