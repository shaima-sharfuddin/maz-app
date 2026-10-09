import { View, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";

// "Step 2 of 3 · Contact" over a segmented bar, for multi-step forms (NewUserSignUp).
// `current` is 1-based; a value past `total` (e.g. a review step) fills every segment and shows `label` alone.
export default function StepProgress({ current, total, label }) {
  const { colors } = useTheme();
  const done = current > total;
  const caption = done ? label : `Step ${current} of ${total}${label ? ` · ${label}` : ""}`;

  return (
    <View
      className="mb-6"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={caption}
      accessibilityValue={{ min: 0, max: total, now: Math.min(current, total) }}
    >
      <Text className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: colors.accent }}>
        {caption}
      </Text>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {Array.from({ length: total }, (_, index) => (
          <View
            key={index}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: index < current ? colors.primary : colors.surfaceBorder,
            }}
          />
        ))}
      </View>
    </View>
  );
}
