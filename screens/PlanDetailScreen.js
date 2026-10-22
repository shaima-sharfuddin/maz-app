import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ParallaxHeader from "../components/ParallaxHeader";
import StickyFooter from "../components/StickyFooter";
import FadeIn from "../components/FadeIn";
import { Section, ListRow } from "../components/Section";
import EmptyState from "../components/EmptyState";
import AnimatedButton from "../components/AnimatedButton";
import { planPhotos } from "../theme/imagery";
import { TRUST_STATS, HOW_IT_WORKS } from "../data/brand";
import { formatBHD, PLACEHOLDER_MONTHLY_RATE_BHD, MIN_LEASE_MONTHS, MAX_LEASE_MONTHS } from "../data/pricing";
import { planRoute } from "../utils/openPlan";
import { useTheme } from "../theme/ThemeContext";
import { TYPE } from "../theme/theme";

// One "How it works" step: numbered disc on a connecting line (the last step has no line below it).
function Step({ index, step, last }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row" }}>
      <View style={{ alignItems: "center", marginRight: 16 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={step.icon} size={18} color={colors.text} />
        </View>
        {last ? null : <View style={{ width: 1, flex: 1, minHeight: 18, backgroundColor: colors.divider, marginVertical: 4 }} />}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 18, paddingTop: 2 }}>
        <Text style={[TYPE.overline, { color: colors.textMuted }]}>Step {index + 1}</Text>
        <Text style={[TYPE.cardTitle, { color: colors.text, marginTop: 2 }]}>{step.title}</Text>
        <Text style={[TYPE.body, { color: colors.textMuted, marginTop: 2 }]}>{step.body}</Text>
      </View>
    </View>
  );
}

// A service, Airbnb-listing style (Visual system v2): parallax photo header, title block, hairline sections, and a
// sticky price bar whose action starts the request (planRoute: Office Suites → the CR question, else the lease term).
// route.params.plan = a SERVICES entry (via fetchPlans / openPlan). Photos are illustrative stock; the price is the
// app's sample rate — both said on screen. No amenities are listed: MAZ hasn't confirmed per-plan details.
export default function PlanDetailScreen({ navigation, route }) {
  const { colors } = useTheme();
  const plan = route.params?.plan;

  if (!plan) {
    return (
      <View className="flex-1 px-6 justify-center" style={{ backgroundColor: colors.canvas }}>
        <EmptyState icon="business-outline" title="This service isn't available" message="Go back and choose a service.">
          <AnimatedButton label="Go back" onPress={() => navigation.goBack()} />
        </EmptyState>
      </View>
    );
  }

  const choose = () => {
    const { name, params } = planRoute(plan);
    navigation.navigate(name, params);
  };

  const included = [
    { icon: "document-text-outline", label: plan.description },
    { icon: "calendar-outline", label: `Lease from ${MIN_LEASE_MONTHS} to ${MAX_LEASE_MONTHS} months` },
    { icon: "wallet-outline", label: "Paid in full, upfront — one invoice, no instalments" },
    plan.requiresCr
      ? { icon: "ribbon-outline", label: "Use your existing CR, or register a new one with MAZ" }
      : null,
  ].filter(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ParallaxHeader photos={planPhotos(plan)} title={plan.title} onBack={() => navigation.goBack()}>
        <FadeIn>
          <Text accessibilityRole="header" style={[TYPE.screenTitle, { color: colors.text }]}>
            {plan.title}
          </Text>
          <Text style={[TYPE.body, { color: colors.textMuted, marginTop: 6 }]}>
            {plan.tagline ?? plan.description}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 20 }}>
            <Ionicons name="star" size={13} color={colors.text} style={{ marginRight: 4 }} />
            <Text style={[TYPE.label, { color: colors.text, fontWeight: "600" }]}>{TRUST_STATS[0].value}</Text>
            <Text style={[TYPE.label, { color: colors.textMuted }]}> · Google rating · Bahrain</Text>
          </View>
        </FadeIn>

        <FadeIn index={1}>
          <Section title="What you get">
            {included.map((row) => (
              <ListRow key={row.label} icon={row.icon} label={row.label} />
            ))}
            <Text style={[TYPE.caption, { color: colors.textSubtle, marginTop: 10 }]}>
              Photos are illustrative. MAZ confirms your unit after payment.
            </Text>
          </Section>
        </FadeIn>

        <FadeIn index={2}>
          <Section title="How it works">
            {HOW_IT_WORKS.map((step, index) => (
              <Step key={step.title} index={index} step={step} last={index === HOW_IT_WORKS.length - 1} />
            ))}
          </Section>
        </FadeIn>
      </ParallaxHeader>

      <StickyFooter
        amount={`${formatBHD(PLACEHOLDER_MONTHLY_RATE_BHD)} / month`}
        caption="Sample price · MAZ confirms final pricing"
        label={plan.requiresCr ? "Get started" : "Choose term"}
        onPress={choose}
      />
    </View>
  );
}
