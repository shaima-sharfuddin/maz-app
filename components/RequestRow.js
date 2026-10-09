import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "./PressableScale";
import StatusBadge from "./StatusBadge";
import { REQUEST_STEPS } from "../data/requestSteps";
import { formatBHD } from "../data/pricing";
import { formatDate } from "../utils/formatDate";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";
import { TYPE } from "../theme/theme";

// Where an office request is, and what (if anything) the customer needs to do.
export function requestCaption(request) {
  // A paid request's contract starts as Reviewing (CONTRACT_STATUS "b"), per the recruiter.
  if (request.contract) return { status: request.contract.status, text: "Paid · Contract under review" };
  if (request.payment) return { status: "paid", text: "Paid" };
  if (request.invoice) {
    return {
      status: "due",
      text: `Invoice ready · ${formatBHD(request.invoice.amount)} due by ${formatDate(request.invoice.dueDate)}`,
    };
  }
  const step = REQUEST_STEPS[request.currentStep - 1];
  return { status: "requested", text: `Stage ${request.currentStep} of ${REQUEST_STEPS.length} · ${step?.label ?? ""}` };
}

// An office request as a tappable row (dashboard "Your office request", My Requests). `showId` adds the
// request number and submission date under the caption.
export default function RequestRow({ request, onPress, showId = false, style }) {
  const { colors } = useTheme();
  const card = useCardStyle();
  const { status, text } = requestCaption(request);
  const title = request.summary ? `${request.summary.plan} · ${request.summary.term}` : "Office request";
  const meta = showId
    ? [`Request ${request.requestId}`, request.submittedAt ? `Submitted ${formatDate(request.submittedAt.slice(0, 10))}` : null]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={[title, text, meta].filter(Boolean).join(", ")}
      containerStyle={style}
      style={{
        ...card,
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
      }}
    >
      <View style={{ flex: 1, marginRight: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
          <Text style={[TYPE.cardTitle, { color: colors.text }]}>{title}</Text>
          <StatusBadge status={status} />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>{text}</Text>
        {meta ? <Text style={{ color: colors.textSubtle, fontSize: 12, marginTop: 4 }}>{meta}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </PressableScale>
  );
}
