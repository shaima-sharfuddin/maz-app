import { useState } from "react";
import { View, Text, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import ScreenTitle from "../components/ScreenTitle";
import StickyFooter from "../components/StickyFooter";
import FadeIn from "../components/FadeIn";
import { Section, ListRow } from "../components/Section";
import { planPhotos } from "../theme/imagery";
import { RADIUS, TYPE } from "../theme/theme";
import useSubmit from "../hooks/useSubmit";
import { submitRequest } from "../services/api";
import { buildRequestSummary } from "../data/pricing";
import { useTheme } from "../theme/ThemeContext";
import { useAuth } from "../auth/AuthContext";
import InfoNote from "../components/InfoNote";
import { DEMO_NOTES } from "../data/demoNotes";

// SelectTerm → here → RequestInvoice: the last look before the request is sent. The invoice is issued at once (no
// status stepper — client, 2026-10-20), so submitting opens it, ready to pay. Submits with the
// signed-in user's name, email and company (collected at sign-up — no details form, client feedback
// 2026-10-07), plus a New User's sign-up Activities (null for tenants). "Edit" goes back to SelectTerm.
// Visual system v2: Airbnb's "Confirm and pay" — a mini listing card, hairline sections (lease, price, requester) and
// a sticky footer with the total and the submit action.
export default function ReviewRequestScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { plan, termMonths, cr = null } = route.params ?? {}; // cr: Office Suites only
  const { submit, loading, error } = useSubmit(submitRequest);
  // Set once the request is sent. This screen stays in the stack (Back retraces every step), but the
  // request can't be sent twice — the button opens its invoice instead.
  const [submitted, setSubmitted] = useState(null); // { requestId, summary }

  if (!plan || !termMonths) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.canvas }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />
          <EmptyState
            icon="document-text-outline"
            title="Your request is incomplete"
            message="Choose a lease length first."
          >
            <AnimatedButton label="Go back" onPress={() => navigation.goBack()} />
          </EmptyState>
        </View>
      </SafeAreaView>
    );
  }

  const summary = buildRequestSummary(plan.title, termMonths, cr);
  const customerRows = [
    user?.name ? { label: "Customer", value: user.name } : null,
    user?.companyName ? { label: "Company", value: user.companyName } : null,
    user?.activities?.length ? { label: user.activities.length > 1 ? "Activities" : "Activity", value: user.activities.join(", ") } : null,
    user?.email ? { label: "Email", value: user.email } : null,
  ].filter(Boolean);

  const openInvoice = (sent) => navigation.navigate("RequestInvoice", { requestId: sent.requestId });

  const onSubmit = async () => {
    const result = await submit({
      fullName: user?.name ?? "",
      email: user?.email ?? "",
      companyName: user?.companyName ?? "",
      activities: user?.activities ?? null, // New User's sign-up Activities (mock request only); null for tenants
      remark: "",
      termMonths,
      cr,
      summary,
    });
    if (!result) return; // shown by the ErrorBanner below
    const sent = { requestId: result.requestId, summary };
    setSubmitted(sent);
    openInvoice(sent);
  };

  const priceRows = [
    { label: "Monthly rate", value: summary.monthlyRate },
    { label: summary.rentLabel, value: summary.rent },
    { label: "Deposit", value: summary.deposit },
    summary.crFee ? { label: "CR registration fee", value: summary.crFee } : null,
  ].filter(Boolean);

  return (
    <SafeAreaView edges={["top"]} className="flex-1" style={{ backgroundColor: colors.canvas }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-6">
          <BackButton onPress={() => navigation.goBack()} />

          <ScreenTitle title="Confirm your request" subtitle="MAZ confirms your unit and final pricing after payment." />

          {/* Mini listing card: the photo and what's being requested. */}
          <FadeIn>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
              <Image
                source={planPhotos(plan)[0]}
                style={{ width: 104, height: 88, borderRadius: RADIUS.md, marginRight: 16 }}
                resizeMode="cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={[TYPE.listingTitle, { color: colors.text }]}>{plan.title}</Text>
                <Text style={[TYPE.caption, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={2}>
                  {plan.tagline ?? plan.description}
                </Text>
                {summary.cr ? (
                  <Text style={[TYPE.caption, { color: colors.text, marginTop: 6, fontWeight: "600" }]}>{summary.cr}</Text>
                ) : null}
              </View>
            </View>

            {/* Office requests are MOCK (services/mockApi.js submitRequest): saved in the app, never sent to MAZ. */}
            <InfoNote boxed style={{ marginBottom: 4 }}>
              {DEMO_NOTES.reviewRequest}
            </InfoNote>
          </FadeIn>

          <FadeIn index={1}>
            <Section
              title="Your lease"
              action={submitted || loading ? null : { label: "Edit", onPress: () => navigation.goBack() }}
            >
              <ListRow icon="calendar-outline" label="Lease length" value={summary.term} />
              <ListRow icon="wallet-outline" label="Payment" value={summary.payment} />
              {summary.location ? <ListRow icon="location-outline" label="Location" value={`${summary.location} (sample)`} /> : null}
            </Section>
          </FadeIn>

          <FadeIn index={2}>
            <Section title="Price details">
              {priceRows.map((row) => (
                <ListRow key={row.label} label={row.label} value={row.value} />
              ))}
              <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 6 }} />
              <ListRow label="Total (BHD)" value={summary.firstInvoiceTotal} strong />
              {summary.isPlaceholder ? (
                <Text style={[TYPE.caption, { color: colors.textSubtle, marginTop: 8 }]}>
                  Sample rate and deposit — MAZ confirms final pricing.
                </Text>
              ) : null}
            </Section>
          </FadeIn>

          {customerRows.length > 0 ? (
            <FadeIn index={3}>
              <Section title="Requesting as">
                {customerRows.map((row) => (
                  <ListRow key={row.label} label={row.label} value={row.value} />
                ))}
              </Section>
            </FadeIn>
          ) : null}
        </View>
      </ScrollView>

      <StickyFooter
        amount={summary.firstInvoiceTotal}
        caption="Total · paid in full"
        label={submitted ? "View invoice" : loading ? "Preparing…" : "Submit request"}
        onPress={submitted ? () => openInvoice(submitted) : onSubmit}
        loading={loading}
      >
        {submitted ? (
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} style={{ marginRight: 6 }} />
            <Text style={[TYPE.caption, { color: colors.success, fontWeight: "600" }]}>Request submitted · invoice issued</Text>
          </View>
        ) : (
          <ErrorBanner message={error} onRetry={onSubmit} />
        )}
      </StickyFooter>
    </SafeAreaView>
  );
}
