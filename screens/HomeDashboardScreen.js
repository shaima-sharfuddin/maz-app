import { useCallback, useRef } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AnimatedButton from "../components/AnimatedButton";
import TrustStats from "../components/TrustStats";
import ScreenTitle from "../components/ScreenTitle";
import EmptyState from "../components/EmptyState";
import PressableScale from "../components/PressableScale";
import SectionHeading from "../components/SectionHeading";
import ServiceCard from "../components/ServiceCard";
import RequestRow from "../components/RequestRow";
import StaleDataNote from "../components/StaleDataNote";
import TextLink from "../components/TextLink";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import ErrorBanner from "../components/ErrorBanner";
import FadeIn from "../components/FadeIn";
import HeroPanel from "../components/HeroPanel";
import AmountHero from "../components/AmountHero";
import InfoNote from "../components/InfoNote";
import PhotoHero from "../components/PhotoHero";
import BrandMark from "../components/BrandMark";
import useAsync from "../hooks/useAsync";
import {
  fetchDashboard,
  fetchDashboardActivity,
  fetchTenantName,
  fetchUnreadCount,
  fetchLatestRequest,
  fetchPlans,
  payNowTarget,
  describeExpiry,
  getExpiryNote,
  AUTH_IS_MOCK,
  PAYMENT_SUMMARY_NOTE,
  errorMessage,
} from "../services/api";
import { TRUST_STATS, BAHRAIN_ADVANTAGES } from "../data/brand";
import { formatBHD } from "../data/pricing";
import { formatDate } from "../utils/formatDate";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";
import { RADIUS, TYPE } from "../theme/theme";
import { useDemo } from "../demo/DemoContext";
import { useAuth } from "../auth/AuthContext";

function ServiceSkeleton() {
  return (
    <SkeletonCard style={{ marginBottom: 16, padding: 16, flexDirection: "row", alignItems: "center" }}>
      <Skeleton width={44} height={44} radius={12} style={{ marginRight: 14 }} />
      <View style={{ flex: 1 }}>
        <Skeleton width="50%" height={16} style={{ marginBottom: 8 }} />
        <Skeleton width="85%" height={12} />
      </View>
    </SkeletonCard>
  );
}

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
      <SkeletonCard style={{ padding: 20, marginBottom: 32 }}>
        <Skeleton width="35%" height={14} style={{ marginBottom: 20 }} />
        <View style={{ flexDirection: "row", gap: 16 }}>
          {[0, 1, 2].map((key) => (
            <View key={key} style={{ flex: 1 }}>
              <Skeleton width="50%" height={28} style={{ marginBottom: 8 }} />
              <Skeleton width="70%" height={12} />
            </View>
          ))}
        </View>
      </SkeletonCard>
    </View>
  );
}

// Small rounded icon tile that opens a dashboard card's header.
function CardIcon({ icon }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: RADIUS.sm,
        backgroundColor: colors.primarySoft,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
      }}
    >
      <Ionicons name={icon} size={16} color={colors.primary} />
    </View>
  );
}

// A figure the data doesn't provide (null) is shown as a dash, never as 0.
const UNKNOWN_VALUE = "—";

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
                {[item.unit, when, item.demo ? "Demo contract" : null].filter(Boolean).join(" · ")}
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

// The Contracts card: ONLY total / active / expired from the REAL contracts (MAZ's own status enum) — no other
// breakdown (client, 2026-10-08). Tap → Contract List.
function ContractsCard({ summary, onPress }) {
  const { colors } = useTheme();
  const card = useCardStyle();
  // `dot` marks the status a column counts (success = active, muted = expired); Total has none.
  const columns = [
    { label: "Total", value: summary.totalCount },
    { label: "Active", value: summary.activeCount, dot: colors.success },
    { label: "Expired", value: summary.expiredCount, dot: colors.textSubtle },
  ];

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`Contracts: ${columns.map((c) => `${c.value} ${c.label.toLowerCase()}`).join(", ")}. View all contracts`}
      containerStyle={{ marginBottom: 32 }}
      style={[card, { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20 }]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
        <CardIcon icon="document-text-outline" />
        <Text style={[TYPE.cardTitle, { flex: 1, color: colors.text }]}>Contracts</Text>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.surfaceMuted,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
        </View>
      </View>
      <View style={{ flexDirection: "row" }}>
        {columns.map((column, index) => (
          <View
            key={column.label}
            style={{
              flex: 1,
              paddingLeft: index > 0 ? 16 : 0,
              borderLeftWidth: index > 0 ? 1 : 0,
              borderLeftColor: colors.divider,
            }}
          >
            <Text style={[TYPE.statValue, { color: colors.text }]}>{column.value ?? UNKNOWN_VALUE}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
              {column.dot ? (
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: column.dot, marginRight: 6 }} />
              ) : null}
              <Text style={[TYPE.caption, { color: colors.textMuted }]}>{column.label}</Text>
            </View>
          </View>
        ))}
      </View>
    </PressableScale>
  );
}

// Tenant shortcut — three separate elevated tiles side by side: icon, label and a short status caption.
// Notifications has no tile — the header bell is its single entry point.
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

export default function HomeDashboardScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { userState } = useDemo();
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

  // The bell's unread count has its own loader, refreshed whenever the dashboard regains focus
  // (e.g. back from Notifications). The last known count stays up while it refreshes.
  const loadUnread = useCallback(() => fetchUnreadCount(userState), [userState]);
  const unread = useAsync(loadUnread, { keepData: true, keepDataOnError: true });
  const unreadCount = unread.error ? null : (unread.data?.count ?? null);

  // The latest office request (mock — no requests API yet) is refreshed the same way, so its stage
  // is current when coming back from RequestStatus or Payment.
  // keepDataOnError (bell + request card): a failed focus refresh keeps the earlier, read-only figures on screen.
  const latestRequest = useAsync(fetchLatestRequest, { keepData: true, keepDataOnError: true });

  // New users: the services they can request ("What are you looking for?"), same source as Browse Plans.
  const isTenant = userState === "tenant";
  const loadPlans = useCallback(() => (isTenant ? Promise.resolve(null) : fetchPlans()), [isTenant]);
  const plans = useAsync(loadPlans);

  const skipFirstFocus = useRef(true);
  const reloadUnread = unread.reload;
  const reloadRequest = latestRequest.reload;
  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocus.current) {
        skipFirstFocus.current = false;
        return;
      }
      reloadUnread();
      reloadRequest();
    }, [reloadUnread, reloadRequest])
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
        <SectionHeading>Your office request</SectionHeading>
        <RequestRow
          request={request}
          onPress={() => navigation.navigate("RequestStatus", { requestId: request.requestId, summary: request.summary })}
        />
        {latestRequest.stale ? <StaleDataNote onRetry={reloadRequest} /> : null}
        <TextLink align="left" onPress={() => navigation.navigate("MyRequests")} style={{ marginTop: 4 }}>
          <Text className="text-sm font-medium" style={{ color: colors.text }}>
            View all requests
          </Text>
        </TextLink>
      </View>
    );
  };

  const cardStyle = useCardStyle();

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
            onOpen={(item) => navigation.navigate(item.target.screen, item.target.params)}
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

        <FadeIn index={3}>
          <ContractsCard summary={summary} onPress={() => navigation.navigate("ContractList")} />
        </FadeIn>
      </>
    );

    return (
      <View>
        {AUTH_IS_MOCK ? (
          // Honest about the demo login: it maps to MAZ's demo customer (services/mock/mockCustomerIdentity.js),
          // so the real MAZ contracts below may not belong to the person using the app.
          <FadeIn>
            <InfoNote boxed style={{ marginBottom: 16 }}>
              Demo account — the contracts shown are a MAZ demo customer&apos;s, not necessarily yours.
            </InfoNote>
          </FadeIn>
        ) : null}

        {contractSections}

        <FadeIn index={4}>
          <SectionHeading>Quick actions</SectionHeading>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 32 }}>
            <QuickAction
              icon="calendar-outline"
              label="Meeting rooms"
              caption={
                activity ? (activity.nextBooking ? `Next: ${formatDate(activity.nextBooking.date)}` : "Book a room") : null
              }
              onPress={() => navigation.navigate("MeetingRooms")}
            />
            <QuickAction
              icon="chatbubbles-outline"
              label="Support"
              caption={activity ? (activity.openEnquiries > 0 ? `${activity.openEnquiries} open` : "Get help") : null}
              onPress={() => navigation.navigate("Support")}
            />
            <QuickAction
              icon="shield-checkmark-outline"
              label="Violations"
              caption={
                activity ? (activity.openViolations > 0 ? `${activity.openViolations} open · demo` : "All clear") : null
              }
              onPress={() => navigation.navigate("Violations")}
            />
          </View>
        </FadeIn>

        {/* Secondary: only a request submitted this session shows here; "Find a new office" is the tenant's
            way into the request flow. Contracts are listed on ContractList (the Contracts card), notifications
            behind the header bell. */}
        <FadeIn index={5}>
          {renderRequestSection()}

          <AnimatedButton
            label="Find a new office"
            variant="secondary"
            onPress={() => navigation.navigate("BrowsePlans")}
          />
        </FadeIn>
      </View>
    );
  };

  // Services open Term & payments directly; Meeting Rooms (hourly) open the hourly booking.
  const openService = (plan) =>
    plan.hourly ? navigation.navigate("MeetingRooms") : navigation.navigate("SelectTerm", { plan });

  const renderServices = () => {
    if (plans.loading) return [0, 1, 2].map((key) => <ServiceSkeleton key={key} />);
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
    return plans.data.map((plan) => (
      <ServiceCard key={plan.id} plan={plan} onPress={() => openService(plan)} />
    ));
  };

  // A request under way is shown first; the services follow so another one can be started.
  const renderNewUser = () => (
    <FadeIn index={1}>
      {renderRequestSection()}
      <View className="mb-8">
        <Text style={[TYPE.sectionTitle, { color: colors.text, marginBottom: 4 }]}>
          {request ? "Looking for something else?" : "What are you looking for?"}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 16 }}>
          Choose a service to see how it works.
        </Text>
        {renderServices()}
      </View>

      <SectionHeading>Why MAZ</SectionHeading>
      <TrustStats stats={TRUST_STATS} />
      <View style={[cardStyle, { flexDirection: "row", marginTop: 12, marginBottom: 32 }]}>
        {BAHRAIN_ADVANTAGES.map((item, index) => (
          <View
            key={item.label}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 16,
              borderLeftWidth: index > 0 ? 1 : 0,
              borderLeftColor: colors.divider,
            }}
          >
            <Text className="text-lg font-bold" style={{ color: colors.primary }}>
              {item.value}
            </Text>
            <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      <SectionHeading>What our clients say</SectionHeading>
      {/* PLACEHOLDER — real testimonials need MAZ's permission before they can be used here. */}
      <EmptyState
        dashed
        icon="chatbubbles-outline"
        title="Client stories coming soon"
        message="Hear from the founders and directors who call MAZ home."
      />
    </FadeIn>
  );

  // The customer record's name is only a fallback (the session's name comes first) and never blocks the screen.
  const loadTenantName = useCallback(() => (isTenant ? fetchTenantName() : Promise.resolve(null)), [isTenant]);
  const tenantName = useAsync(loadTenantName).data;
  const name = user?.name || (isTenant ? tenantName : undefined);

  // Header icon buttons: a 40pt bordered circle inside the 44pt tap target.
  const headerIconStyle = {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.headerGlass,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <PhotoHero
          photo="dashboard"
          overlay="fade"
          rounded={false}
          minHeight={330}
          contentStyle={{ paddingHorizontal: 24, paddingTop: 16, justifyContent: "space-between" }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <BrandMark width={88} />
            <View style={{ flexDirection: "row", gap: 4, marginRight: -2 }}>
              <PressableScale
                onPress={() => navigation.navigate("Notifications")}
                accessibilityRole="button"
                accessibilityLabel={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
                style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
              >
                <View style={headerIconStyle}>
                  <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
                </View>
                {unreadCount ? (
                  <View
                    style={{
                      position: "absolute",
                      top: 9,
                      right: 9,
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: colors.highlight,
                      borderWidth: 2,
                      borderColor: colors.sheet,
                    }}
                  />
                ) : null}
              </PressableScale>
              <PressableScale
                onPress={() => navigation.navigate("Settings")}
                accessibilityRole="button"
                accessibilityLabel="Settings"
                style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
              >
                <View style={headerIconStyle}>
                  <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
                </View>
              </PressableScale>
            </View>
          </View>

          <View style={{ paddingTop: 96 }}>
            {profileSaved ? (
              <Text className="text-sm mb-4" style={{ color: colors.success }}>
                {"✓"} Profile saved
              </Text>
            ) : null}

            <FadeIn>
              <ScreenTitle
                eyebrow="MAZ Business Center"
                title={isTenant ? `Welcome back${name ? `, ${name}` : ""}` : name ? `Welcome, ${name}` : "Welcome"}
                subtitle={
                  isTenant
                    ? "Here's an overview of your contracts and payments."
                    : "Your prestigious business address in Bahrain begins here."
                }
              />
            </FadeIn>
          </View>
        </PhotoHero>

        <View className="flex-1 px-6 pb-10">
          {isTenant ? renderTenant() : renderNewUser()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
