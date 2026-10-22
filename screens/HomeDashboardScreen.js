import { useCallback, useRef, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AnimatedButton from "../components/AnimatedButton";
import TrustStats from "../components/TrustStats";
import EmptyState from "../components/EmptyState";
import PressableScale from "../components/PressableScale";
import PlanCard, { PlanCardSkeleton } from "../components/PlanCard";
import SearchPill from "../components/SearchPill";
import FeatureCard from "../components/FeatureCard";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import CategoryChips from "../components/CategoryChips";
import { Section } from "../components/Section";
import RequestRow from "../components/RequestRow";
import StaleDataNote from "../components/StaleDataNote";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import ErrorBanner from "../components/ErrorBanner";
import FadeIn from "../components/FadeIn";
import HeroPanel from "../components/HeroPanel";
import AmountHero from "../components/AmountHero";
import InfoNote from "../components/InfoNote";
import BrandMark from "../components/BrandMark";
import useAsync from "../hooks/useAsync";
import {
  fetchDashboard,
  fetchDashboardActivity,
  fetchTenantName,
  fetchLatestRequest,
  fetchPlans,
  payNowTarget,
  describeExpiry,
  getExpiryNote,
  PAYMENT_SUMMARY_NOTE,
  errorMessage,
} from "../services/api";
import { TRUST_STATS, BAHRAIN_ADVANTAGES } from "../data/brand";
import { formatBHD } from "../data/pricing";
import { formatDate } from "../utils/formatDate";
import { useTheme } from "../theme/ThemeContext";
import { DEMO_NOTES } from "../data/demoNotes";
import { useCardStyle } from "../theme/surfaces";
import { PALETTE, RADIUS, TYPE } from "../theme/theme";
import { WORKSPACE_PHOTOS } from "../theme/imagery";
import { useAuth, useAccountState } from "../auth/AuthContext";
import { openPlan } from "../utils/openPlan";
import { navigateTo } from "../utils/navigation";

// Placeholder for the contract-dependent sections (Payment, Contracts) while /contracts loads.
function TenantSkeleton() {
  return (
    <View>
      <SkeletonCard style={{ padding: 20, marginBottom: 24, borderRadius: 20 }}>
        <Skeleton width="30%" height={14} style={{ marginBottom: 24 }} />
        <Skeleton width="25%" height={11} style={{ marginBottom: 10 }} />
        <Skeleton width="60%" height={36} style={{ marginBottom: 20 }} />
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} width="100%" height={12} style={{ marginBottom: 14 }} />
        ))}
        <Skeleton width="100%" height={52} radius={12} style={{ marginTop: 6 }} />
      </SkeletonCard>
    </View>
  );
}

// The Payment card: total / paid / balance / due CALCULATED from the REAL installments with the PROVISIONAL paid
// rule (services/paymentSummary.js) — labelled so. Pay now pays the due amount first, else the outstanding balance;
// with nothing outstanding there's no button.
function PaymentCard({ payment, onPayNow }) {
  const { colors } = useTheme();
  const target = payNowTarget(payment);
  // Fintech hierarchy: the Due amount leads, the supporting figures follow, then the action — all on one panel.
  const rows = [
    { label: "Total contract amount", value: formatBHD(payment.total) },
    { label: "Amount paid", value: formatBHD(payment.paid) },
    { label: "Balance", value: formatBHD(payment.balance) },
  ];
  return (
    <View style={{ marginBottom: 24 }}>
      <HeroPanel style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: RADIUS.sm,
              backgroundColor: colors.heroGlass,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="wallet-outline" size={16} color={colors.onHero} />
          </View>
          <Text style={[TYPE.cardTitle, { color: colors.onHero }]}>Payment</Text>
        </View>
        {/* Presentation copy (visual phase 3). */}
        <Text style={[TYPE.caption, { color: colors.onHeroSubtle, marginBottom: 22, marginLeft: 42 }]}>
          Know what&apos;s due. Know what&apos;s next.
        </Text>
        <AmountHero
          onHero
          size="display"
          label="Due amount"
          amount={formatBHD(payment.due)}
          muted={!(payment.due > 0)}
          style={{ marginBottom: 18 }}
        />
        {rows.map((row) => (
          <View
            key={row.label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: colors.heroDivider,
            }}
          >
            <Text style={[TYPE.label, { color: colors.onHeroMuted, marginRight: 12 }]}>{row.label}</Text>
            <Text style={[TYPE.value, { flexShrink: 1, textAlign: "right", color: colors.onHero }]}>{row.value}</Text>
          </View>
        ))}
        <View style={{ marginTop: 14 }}>
          {target ? (
            <>
              <AnimatedButton variant="inverse" label={`Pay now · ${formatBHD(target.amount)}`} onPress={onPayNow} />
              <Text style={[TYPE.caption, { color: colors.onHeroSubtle, textAlign: "center", marginTop: 10 }]}>
                {target.kind === "due" ? "Pays your due amount" : "Nothing is due yet — pays your outstanding balance"}
              </Text>
            </>
          ) : (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: colors.heroGlass,
                borderRadius: RADIUS.md,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={{ color: colors.onHero, fontSize: 14, fontWeight: "600" }}>No payment due</Text>
            </View>
          )}
        </View>
      </HeroPanel>
      <InfoNote style={{ marginTop: 12, paddingHorizontal: 4 }}>
        {PAYMENT_SUMMARY_NOTE}.
        {payment.demoPaidAmount > 0
          ? ` Includes ${formatBHD(payment.demoPaidAmount)} paid with demo payments this session.`
          : ""}
      </InfoNote>
    </View>
  );
}

// "Contract expiring soon": every ACTIVE contract with 10 days or fewer left (contractService.expiringSoon — the
// confirmed rule on the REAL end date), each named with its end date; tapping one opens its Contract Details, where
// "Renew contract" lives. Nothing shows when no contract qualifies.
function ExpiringSoonAlert({ items, onOpen }) {
  const { colors } = useTheme();
  if (!items?.length) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: colors.warningSoft,
        borderWidth: 1,
        borderColor: colors.warningBorder,
        borderRadius: RADIUS.card,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 6,
        marginBottom: 16,
      }}
    >
      <View style={{ position: "absolute", left: 0, top: 16, bottom: 16, width: 3, borderRadius: 2, backgroundColor: colors.warning }} />
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.warningBorder,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons name="time-outline" size={16} color={colors.warning} />
        </View>
        <Text style={[TYPE.cardTitle, { flex: 1, color: colors.text }]}>
          {items.length === 1 ? "Contract expiring soon" : `${items.length} contracts expiring soon`}
        </Text>
      </View>
      {items.map((item) => {
        const when = describeExpiry({ state: "expiring", daysLeft: item.daysLeft });
        return (
          <PressableScale
            key={item.contractId}
            onPress={() => onOpen(item)}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={`${item.contractId} expires on ${formatDate(item.endDate)}, ${when}. Renew contract`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: colors.warningBorder,
              minHeight: 44,
            }}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
                {item.contractId} expires on {formatDate(item.endDate)}
              </Text>
              <Text style={[TYPE.caption, { color: colors.textMuted, marginTop: 2 }]}>
                {[item.unit, when].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <Text style={{ color: colors.warning, fontSize: 13, fontWeight: "600", marginRight: 2 }}>Renew contract</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.warning} />
          </PressableScale>
        );
      })}
      <Text style={[TYPE.caption, { color: colors.textMuted, paddingTop: 6, paddingBottom: 10 }]}>
        {getExpiryNote()}
      </Text>
    </View>
  );
}

// One "Quick actions" tile (the dashboard's last block): icon circle, label, optional caption.
function QuickAction({ icon, label, caption, onPress }) {
  const { colors } = useTheme();
  const card = useCardStyle();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityLabel={caption ? `${label}, ${caption}` : label}
      containerStyle={{ flex: 1 }}
      style={[card, { alignItems: "center", paddingHorizontal: 6, paddingVertical: 18, minHeight: 120 }]}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.primarySoft,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={{ color: colors.text, fontSize: 14, lineHeight: 18, fontWeight: "600", textAlign: "center" }}>
        {label}
      </Text>
      {caption ? (
        <Text style={[TYPE.caption, { color: colors.textMuted, textAlign: "center", marginTop: 2 }]}>{caption}</Text>
      ) : null}
    </PressableScale>
  );
}

// Section header (2026-10-22 polish — "looks like plain text"): the brand's crimson square, a title, an optional
// one-line subtitle and an optional "See all"-style pill on the right.
function SectionHeader({ title, subtitle, action, style }) {
  const { colors } = useTheme();
  return (
    <View style={[{ flexDirection: "row", alignItems: "flex-end", marginBottom: 16 }, style]}>
      <View style={{ flex: 1, marginRight: action ? 12 : 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: colors.highlight, marginRight: 10 }} />
          <Text accessibilityRole="header" style={[TYPE.sectionTitle, { color: colors.text, fontSize: 20, lineHeight: 26 }]}>
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text style={[TYPE.caption, { color: colors.textMuted, marginTop: 4, marginLeft: 18, fontSize: 13, lineHeight: 18 }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? (
        <PressableScale
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          hitSlop={8}
          style={{
            flexDirection: "row",
            alignItems: "center",
            minHeight: 32,
            paddingLeft: 12,
            paddingRight: 8,
            borderRadius: RADIUS.pill,
            backgroundColor: colors.primarySoft,
          }}
        >
          <Text style={[TYPE.status, { color: colors.primary }]}>{action.label}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} style={{ marginLeft: 2 }} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const TIME_ICONS = { morning: "sunny-outline", afternoon: "partly-sunny-outline", evening: "moon-outline" };

// The greeting as a compact one-row ivory card (user, 2026-10-22: a navy panel looked heavy, then a tall ivory card
// looked too big): initials avatar, "Good evening" with its time icon over the greeting, and — new users only — a
// round navy arrow to Browse Plans. Light mode: a soft white → ivory gradient so it stands apart from the ivory page;
// dark mode: the theme's warm ivory tint.
function GreetingCard({ firstName, fullName, isTenant, onExplore }) {
  const { colors, isDark, elevation } = useTheme();
  const initials = String(fullName || firstName || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  const greeting = isTenant
    ? `Welcome back${firstName ? `, ${firstName}` : ""}`
    : firstName
      ? `Hello, ${firstName}`
      : "Welcome to MAZ";
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: RADIUS.hero,
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
          backgroundColor: isDark ? colors.ivory : colors.surface,
        },
        isDark ? null : { experimental_backgroundImage: `linear-gradient(135deg, #ffffff 0%, ${PALETTE.ivory} 100%)` },
        elevation.card,
      ]}
    >
      {initials ? (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.primary,
            borderWidth: 2,
            borderColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Text style={{ color: colors.onPrimary, fontSize: 16, fontWeight: "700" }}>{initials}</Text>
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name={TIME_ICONS[timeOfDayPart()]} size={13} color={colors.primary} style={{ marginRight: 5 }} />
          <Text style={[TYPE.caption, { color: colors.textMuted, fontWeight: "600" }]}>{timeOfDayGreeting()}</Text>
        </View>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={{ color: colors.heading, fontSize: 20, lineHeight: 26, fontWeight: "700", letterSpacing: -0.3, marginTop: 1 }}
        >
          {greeting}
        </Text>
      </View>
      {!isTenant ? (
        <PressableScale
          onPress={onExplore}
          accessibilityRole="button"
          accessibilityLabel="Explore workspaces"
          containerStyle={{ marginLeft: 12 }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
        </PressableScale>
      ) : null}
    </View>
  );
}

export default function HomeDashboardScreen({ navigation, route }) {
  const { colors } = useTheme();
  const userState = useAccountState(); // from the session's customerId — never a separate demo setting
  const { user } = useAuth();
  const profileSaved = route.params?.profileSaved; // set right after onboarding (App.js initialParams)


  // Re-fetches when the Settings demo toggle changes (tenant ↔ new user).
  // Progressive loading — nothing on the dashboard waits for everything:
  //  • contract data first WITHOUT unit names (counts, Payment) — only /contracts;
  //  • the same again WITH unit names once /units arrives (the expiry alert's unit) — shares that one download;
  //  • Quick actions' captions (mock, no network) and the customer-record name fallback load on their own.
  const loadPrimary = useCallback(() => fetchDashboard(userState, { withUnits: false }), [userState]);
  const primary = useAsync(loadPrimary);
  const loadFull = useCallback(() => fetchDashboard(userState), [userState]);
  const full = useAsync(loadFull);
  const data = full.data ?? primary.data;
  const loading = !data && primary.loading;
  const error = data ? null : primary.error;
  const reloadPrimary = primary.reload;
  const reloadFull = full.reload;
  const reload = useCallback(() => {
    reloadPrimary();
    reloadFull();
  }, [reloadPrimary, reloadFull]);

  const loadActivity = useCallback(() => fetchDashboardActivity(userState), [userState]);
  const activity = useAsync(loadActivity).data;

  // The latest office request (mock — no requests API yet) is refreshed the same way, so its stage
  // is current when coming back from RequestStatus or Payment.
  // keepDataOnError (request card): a failed focus refresh keeps the earlier, read-only figures on screen.
  const latestRequest = useAsync(fetchLatestRequest, { keepData: true, keepDataOnError: true });

  // The services (PlanCards): new users browse them here; tenants get a "Find a new office" row. Same source as
  // Browse Plans.
  const isTenant = userState === "tenant";
  const plans = useAsync(fetchPlans);
  const [category, setCategory] = useState("all");

  // The sticky header turns solid as soon as content scrolls under it (UI thread).
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const headerSolid = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 24], [0, 1], Extrapolation.CLAMP),
  }));

  // "Why MAZ" (new users): its stat cards play their entrance once its top scrolls into view (or at once when the page
  // is short enough to show it without scrolling), so the motion is seen rather than spent off-screen. Its top =
  // the content container's y + the section's y inside it (both measured by onLayout).
  const viewportH = useSharedValue(0);
  const contentTop = useSharedValue(0);
  const whyY = useSharedValue(0);
  const [whyInView, setWhyInView] = useState(false);
  useAnimatedReaction(
    () => {
      if (!viewportH.value || !whyY.value) return false;
      return scrollY.value + viewportH.value >= contentTop.value + whyY.value + 80;
    },
    (visible, previous) => {
      if (visible && !previous) runOnJS(setWhyInView)(true);
    }
  );

  const skipFirstFocus = useRef(true);
  const reloadRequest = latestRequest.reload;
  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocus.current) {
        skipFirstFocus.current = false;
        return;
      }
      reloadRequest();
    }, [reloadRequest])
  );

  // "Your office request" section — shown once a request exists (nothing while the first load
  // runs, so users without a request never see a placeholder flash). Errors offer "Try again".
  const request = latestRequest.data;
  const renderRequestSection = () => {
    if (latestRequest.error) {
      return (
        <View className="mb-8">
          <ErrorBanner message="We couldn't load your office request." onRetry={reloadRequest} />
        </View>
      );
    }
    if (!request) return null;
    return (
      <View className="mb-8">
        <SectionHeader
          title="Your office request"
          action={{ label: "View all", onPress: () => navigateTo(navigation, "MyRequests") }}
        />
        <RequestRow
          request={request}
          onPress={() => navigation.navigate("RequestInvoice", { requestId: request.requestId })}
        />
        {/* Office requests are MOCK (services/mockApi.js) — never presented as sent to MAZ. */}
        <InfoNote style={{ marginBottom: 8 }}>{DEMO_NOTES.requests}</InfoNote>
        {latestRequest.stale ? <StaleDataNote onRetry={reloadRequest} /> : null}
      </View>
    );
  };

  const errorState = (
    <EmptyState
      icon="cloud-offline-outline"
      title="We couldn't load your dashboard"
      message={errorMessage(error)}
    >
      <AnimatedButton label="Try again" onPress={reload} />
    </EmptyState>
  );

  const renderTenant = () => {
    const summary = data?.summary;
    // Only the contract-dependent sections wait for /contracts; the rest of the dashboard is usable at once.
    const contractSections = loading ? (
      <TenantSkeleton />
    ) : error || !summary ? (
      <View style={{ marginBottom: 32 }}>{errorState}</View>
    ) : (
      <>
        <FadeIn index={1}>
          <ExpiringSoonAlert
            items={data.expiringSoon}
            onOpen={(item) => navigateTo(navigation, item.target.screen, item.target.params)}
          />
        </FadeIn>

        {data.payment ? (
          <FadeIn index={2}>
            <PaymentCard
              payment={data.payment}
              onPayNow={() => navigation.navigate("PaymentReview", { scope: { type: "account" } })}
            />
          </FadeIn>
        ) : null}

      </>
    );

    return (
      <View>
        {contractSections}

        {/* Secondary: only a request submitted this session shows here; "Find a new office" is the tenant's
            way into the request flow. Contracts are listed only in the Contracts tab (no dashboard card since
            2026-10-22), notifications in the Alerts tab. */}
        <FadeIn index={5}>
          {renderRequestSection()}

          {plans.data?.length ? (
            <View style={{ marginBottom: 8 }}>
              <SectionHeader
                title="Find a new office"
                subtitle="Another space with MAZ, ready in minutes."
                action={{ label: "Explore", onPress: () => navigation.navigate("BrowsePlans") }}
              />
              {/* Airbnb-style row of listing cards, bleeding to the screen edge. */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={296}
                style={{ marginHorizontal: -24 }}
                contentContainerStyle={{ paddingHorizontal: 24 }}
              >
                {plans.data.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onPress={() => openService(plan)}
                    style={{ width: 280, marginRight: 16, marginBottom: 0 }}
                  />
                ))}
              </ScrollView>
            </View>
          ) : (
            <AnimatedButton label="Find a new office" variant="secondary" onPress={() => navigation.navigate("BrowsePlans")} />
          )}
        </FadeIn>

        <FadeIn index={6} style={{ marginTop: 32 }}>
          {featureCard}
        </FadeIn>

        {/* Quick actions sit last (user, 2026-10-22). */}
        <FadeIn index={6} style={{ marginTop: 32 }}>
          <SectionHeader title="Quick actions" subtitle="Help and compliance in one tap." />
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            <QuickAction
              icon="chatbubbles-outline"
              label="Support"
              caption={activity ? (activity.openEnquiries > 0 ? `${activity.openEnquiries} open · demo` : "Get help") : null}
              onPress={() => navigation.navigate("Support")}
            />
            <QuickAction
              icon="shield-checkmark-outline"
              label="Violations"
              caption={
                activity ? (activity.openViolations > 0 ? `${activity.openViolations} open · demo` : "All clear · demo") : null
              }
              onPress={() => navigation.navigate("Violations")}
            />
            <QuickAction icon="receipt-outline" label="Invoices" caption="All bills" onPress={() => navigation.navigate("Invoices")} />
          </View>
          {/* The quick actions open MOCK features (support, violation notices). */}
          <InfoNote>{DEMO_NOTES.quickActions}</InfoNote>
        </FadeIn>
      </View>
    );
  };

  // A service opens its listing page (PlanDetail) — utils/openPlan.js.
  const openService = (plan) => openPlan(navigation, plan);

  const renderServices = () => {
    if (plans.loading) return [0, 1].map((key) => <PlanCardSkeleton key={key} />);
    if (plans.error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load our services"
          message={errorMessage(plans.error)}
        >
          <AnimatedButton label="Try again" onPress={plans.reload} />
        </EmptyState>
      );
    }
    if (!plans.data?.length) {
      return (
        <EmptyState
          icon="briefcase-outline"
          title="No services available right now"
          message="Our team is preparing new offerings. Please check back shortly."
        />
      );
    }
    const shown = plans.data.filter((plan) => category === "all" || plan.id === category);
    // key={category}: switching category re-plays the cards' entrance.
    return (
      <View key={category}>
        {shown.map((plan, index) => (
          <FadeIn key={plan.id} index={index}>
            <PlanCard plan={plan} onPress={() => openService(plan)} />
          </FadeIn>
        ))}
      </View>
    );
  };

  const categories = [
    { value: "all", label: "All", icon: "grid-outline" },
    ...(plans.data ?? []).map((plan) => ({ value: plan.id, label: plan.title, icon: plan.icon ?? "business-outline" })),
  ];

  // MAZ's real waterfront as an Airbnb-style inspiration card (photo drifts; copy + pill on the photo) — never as a
  // loose banner.
  const featureCard = (
    <FeatureCard
      photo={WORKSPACE_PHOTOS.dashboard}
      eyebrow="Amwaj Islands · Bahrain"
      title="Business by the waterfront"
      body="MAZ Business Center — your prestigious address in Bahrain."
      cta="Explore offices"
      onPress={() => navigation.navigate("BrowsePlans")}
      accessibilityLabel="MAZ Business Center by the Amwaj Islands waterfront. Explore offices."
    />
  );

  // A request under way is shown first; then the listings (filtered by the header's category tabs), the waterfront
  // feature and Why MAZ.
  const renderNewUser = () => (
    <View>
      <FadeIn index={1}>{renderRequestSection()}</FadeIn>
      <FadeIn index={1}>
        <SectionHeader
          title={request ? "Looking for something else?" : "Workspaces for you"}
          subtitle="Fully serviced, ready when you are."
          action={{ label: "See all", onPress: () => navigation.navigate("BrowsePlans") }}
        />
      </FadeIn>
      {renderServices()}

      <FadeIn index={3} style={{ marginTop: 4, marginBottom: 8 }}>
        {featureCard}
      </FadeIn>

      <View onLayout={(event) => whyY.set(event.nativeEvent.layout.y)}>
        <Section>
          <SectionHeader title="Why MAZ" subtitle="A prestigious address with Bahrain's business advantages." />
          <TrustStats stats={TRUST_STATS} variant="cards" play={whyInView} />
          <View style={{ height: 10 }} />
          <TrustStats stats={BAHRAIN_ADVANTAGES} variant="cards" play={whyInView} startIndex={TRUST_STATS.length} />
        </Section>
      </View>

      {/* Quick actions sit last (user, 2026-10-22). */}
      <FadeIn index={5}>
        <SectionHeader title="Quick actions" />
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 8 }}>
          <QuickAction icon="receipt-outline" label="Invoices" caption="All invoices" onPress={() => navigation.navigate("Invoices")} />
          <QuickAction
            icon="clipboard-outline"
            label="My requests"
            caption="Track your requests"
            onPress={() => navigateTo(navigation, "MyRequests")}
          />
        </View>
      </FadeIn>
    </View>
  );

  // The customer record's name is only a fallback (the session's name comes first) and never blocks the screen.
  const loadTenantName = useCallback(() => (isTenant ? fetchTenantName() : Promise.resolve(null)), [isTenant]);
  const tenantName = useAsync(loadTenantName).data;
  const name = user?.name || (isTenant ? tenantName : undefined);


  const firstName = name ? String(name).trim().split(/\s+/)[0] : null;

  return (
    <SafeAreaView edges={["top"]} className="flex-1" style={{ backgroundColor: colors.canvas }}>
      {/* Sticky Airbnb-style header: the search pill (+ category tabs for new users). Transparent over the page glow at
          the top; it turns solid with a hairline once the content scrolls under it. */}
      <View style={{ zIndex: 2 }}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: colors.background,
              borderBottomWidth: 1,
              borderBottomColor: colors.divider,
            },
            headerSolid,
          ]}
        />
        <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: isTenant ? 12 : 4 }}>
          <SearchPill onPress={() => navigation.navigate("BrowsePlans")} />
        </View>
        {!isTenant && plans.data?.length ? (
          <CategoryChips items={categories} value={category} onChange={setCategory} fit style={{ borderBottomWidth: 0 }} />
        ) : null}
      </View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={(event) => viewportH.set(event.nativeEvent.layout.height)}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 }}>
          {profileSaved ? (
            <Text className="text-sm mb-4" style={{ color: colors.success }}>
              {"\u2713"} Profile saved
            </Text>
          ) : null}

          <FadeIn>
            <BrandMark width={72} bare style={{ marginBottom: 16 }} />
            <GreetingCard
              firstName={firstName}
              fullName={name}
              isTenant={isTenant}
              onExplore={() => navigation.navigate("BrowsePlans")}
            />
          </FadeIn>
        </View>

        <View className="flex-1 px-6 pb-10" onLayout={(event) => contentTop.set(event.nativeEvent.layout.y)}>{isTenant ? renderTenant() : renderNewUser()}</View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

// "morning" | "afternoon" | "evening" by the phone's local time (GreetingCard's icon).
function timeOfDayPart(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

// "Good morning" / "Good afternoon" / "Good evening" by the phone's local time.
function timeOfDayGreeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}