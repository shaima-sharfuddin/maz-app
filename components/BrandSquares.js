import { View } from "react-native";

// The rising staircase of squares from MAZ's wordmark — the app's recurring brand motif (hero corners, accents).
// Four columns, 1–4 squares tall, bottom-aligned. Purely decorative.
export default function BrandSquares({ size = 10, gap = 3, color, style }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ flexDirection: "row", alignItems: "flex-end", gap }, style]}
    >
      {[1, 2, 3, 4].map((count) => (
        <View key={count} style={{ gap }}>
          {Array.from({ length: count }, (_, index) => (
            <View key={index} style={{ width: size, height: size, borderRadius: size / 6, backgroundColor: color }} />
          ))}
        </View>
      ))}
    </View>
  );
}
