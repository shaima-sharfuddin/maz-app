import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { REQUEST_STEPS } from "../data/requestSteps";
import { formatDateTime } from "../utils/formatDate";

const CIRCLE = 28;
const RING = 36; // current step gets a soft halo around its circle

const statusLabel = { completed: "completed", current: "in progress", upcoming: "upcoming" };

// Vertical timeline: one row per step with its label, when it was reached (`dates`, local ISO date-times
// by step index — omitted where unknown) and, for the current step, its description. Status is shown by
// the marker (check / filled number / outlined number) and the "In progress" caption, not colour alone.
function VerticalStepper({ current, steps, dates }) {
  const { colors } = useTheme();
  const lastIndex = steps.length - 1;

  return (
    <View accessibilityRole="progressbar">
      {steps.map((step, index) => {
        const status = index < current ? "completed" : index === current ? "current" : "upcoming";
        const reachedAt = status !== "upcoming" ? dates?.[index] : null;
        return (
          <View
            key={step.key}
            style={{ flexDirection: "row" }}
            accessible
            accessibilityLabel={[
              `Step ${index + 1} of ${steps.length}: ${step.label}, ${statusLabel[status]}`,
              reachedAt ? formatDateTime(reachedAt) : null,
            ]
              .filter(Boolean)
              .join(", ")}
          >
            <View style={{ alignItems: "center", width: CIRCLE, marginRight: 14 }}>
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
              {index < lastIndex ? (
                <View
                  style={{
                    flex: 1,
                    width: 2,
                    minHeight: 16,
                    marginVertical: 4,
                    backgroundColor: index < current ? colors.primary : colors.surfaceBorder,
                  }}
                />
              ) : null}
            </View>

            <View style={{ flex: 1, paddingTop: 4, paddingBottom: index < lastIndex ? 20 : 0 }}>
              <Text
                style={{
                  color: status === "upcoming" ? colors.textSubtle : colors.text,
                  fontSize: status === "current" ? 16 : 14,
                  fontWeight: status === "upcoming" ? "500" : "600",
                }}
              >
                {step.label}
              </Text>
              {status === "current" ? (
                <Text className="text-xs font-semibold uppercase tracking-widest mt-1" style={{ color: colors.accent }}>
                  In progress
                </Text>
              ) : null}
              {reachedAt ? (
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>{formatDateTime(reachedAt)}</Text>
              ) : null}
              {status === "current" && step.description ? (
                <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 6 }}>
                  {step.description}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Progress tracker. `currentStep` is 1-based; a value past the last step means every step is complete.
// Pass `steps` to reuse it for other processes. orientation "horizontal" (default): compact row of
// numbered circles; "vertical": a timeline with `dates` and the current step's description.
export default function StatusStepper({ currentStep, steps = REQUEST_STEPS, orientation = "horizontal", dates }) {
  const { colors } = useTheme();
  if (orientation === "vertical") {
    return <VerticalStepper current={currentStep - 1} steps={steps} dates={dates} />;
  }
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
