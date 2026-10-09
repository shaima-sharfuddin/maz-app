import { View, Text } from "react-native";
import { DetailRows } from "./DetailCard";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";
import { TYPE } from "../theme/theme";

// A perforated tear line with notches cut into both edges — the divider of a document / receipt sheet.
// Dashes are drawn as views (dashed single-side borders render unreliably on iOS).
export function Perforation() {
  const { colors } = useTheme();
  const notch = {
    position: "absolute",
    top: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  };
  return (
    <View style={{ height: 20, justifyContent: "center", marginHorizontal: -1 }}>
      <View style={{ flexDirection: "row", overflow: "hidden", marginHorizontal: 20, gap: 5 }}>
        {Array.from({ length: 60 }, (_, index) => (
          <View key={index} style={{ width: 6, height: 1.5, borderRadius: 1, backgroundColor: colors.dashedBorder }} />
        ))}
      </View>
      <View style={[notch, { left: -10 }]} />
      <View style={[notch, { right: -10 }]} />
    </View>
  );
}

// A document: one sheet whose sections are separated by perforations instead of being separate cards.
// sections: [{ key, title, rows?, children? }] (falsy entries are skipped) — rows render as DetailRows, children
// follow them. `header` renders above the first section (e.g. a receipt's amount block).
export default function DocumentSheet({ header, sections = [], style }) {
  const { colors } = useTheme();
  const card = useCardStyle();
  const shown = sections.filter(Boolean);
  return (
    <View style={[card, { marginBottom: 16 }, style]}>
      {header ? (
        <>
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>{header}</View>
          {shown.length ? <Perforation /> : null}
        </>
      ) : null}
      {shown.map((section, index) => (
        <View key={section.key ?? section.title}>
          {index > 0 ? <Perforation /> : null}
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 }}>
            {section.title ? (
              <Text style={[TYPE.overline, { color: colors.accent, marginBottom: 4 }]}>{section.title}</Text>
            ) : null}
            {section.rows?.length ? <DetailRows rows={section.rows} /> : null}
            {section.children}
          </View>
        </View>
      ))}
    </View>
  );
}
