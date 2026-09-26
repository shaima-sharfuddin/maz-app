import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { REQUEST_STEPS } from "../data/requestSteps";

const CIRCLE = 28;
const RING = 36; // current step gets a soft halo around its circle

// Horizontal progress tracker. `currentStep` is 1-based; a value past the last step
// means every step is complete. Pass `steps` to reuse it for other processes.
export default function StatusStepper({ currentStep, steps = REQUEST_STEPS }) {
  const { colors } = useTheme();
  const current = currentStep - 1; // 0-based index of the active step
  const lastIndex = steps.length - 1;

  const statusOf = (index) => (index < current ? "completed" : index === current ? "current" : "upcoming");

  return (
    <View style={{ flexDirection: "row" }} accessibilityRole="progressbar">
      {steps.map((step, index) => {
        const status = statusOf(index);
        // Each column draws its half of the connector on either side of the circle,
        // so segments meet seamlessly across columns.
        const leftReached = index > 0 && index <= current;
        const rightReached = index < lastIndex && index < current;

        return (
          <View
            key={step.key}
            style={{ flex: 1, alignItems: "center" }}
            accessible
            accessibilityLabel={`Step ${index + 1} of ${steps.length}: ${step.label}, ${status === "upcoming" ? "upcoming" : status}`}
          >
            <View style={{ flexDirection: "row", alignItems: "center", height: RING, alignSelf: "stretch" }}>
              <View
                style={{
                  flex: 1,
                  height: 2,
                  backgroundColor: index === 0 ? "transparent" : leftReached ? colors.primary : colors.surfaceBorder,
                }}
              />
              <View
                style={{
                  width: RING,
                  height: RING,
                  borderRadius: RING / 2,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: status === "current" ? colors.primarySoft : "transparent",
                }}
              >
                <View
                  style={{
                    width: CIRCLE,
                    height: CIRCLE,
                    borderRadius: CIRCLE / 2,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: status === "upcoming" ? "transparent" : colors.primary,
                    borderWidth: status === "upcoming" ? 1.5 : 0,
                    borderColor: colors.inputBorder,
                  }}
                >
                  {status === "completed" ? (
                    <Ionicons name="checkmark" size={16} color={colors.onPrimary} />
                  ) : (
                    <Text
                      style={{
                        color: status === "current" ? colors.onPrimary : colors.textSubtle,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>
              </View>
              <View
                style={{
                  flex: 1,
                  height: 2,
                  backgroundColor:
                    index === lastIndex ? "transparent" : rightReached ? colors.primary : colors.surfaceBorder,
                }}
              />
            </View>

            <Text
              numberOfLines={3}
              style={{
                marginTop: 8,
                paddingHorizontal: 2,
                textAlign: "center",
                fontSize: 11,
                lineHeight: 14,
                color: status === "upcoming" ? colors.textSubtle : status === "current" ? colors.text : colors.textMuted,
                fontWeight: status === "current" ? "700" : "500",
              }}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
