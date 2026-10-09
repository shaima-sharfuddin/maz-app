import { useCallback, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import PressableScale from "../components/PressableScale";
import TextLink from "../components/TextLink";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import useSubmit from "../hooks/useSubmit";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NOTIFICATIONS_DEMO_NOTE,
  errorMessage,
} from "../services/api";
import { formatTimestamp } from "../utils/formatDate";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";
import { RADIUS, TYPE } from "../theme/theme";
import FadeIn from "../components/FadeIn";
import InfoNote from "../components/InfoNote";
import SectionHeading from "../components/SectionHeading";
import { useDemo } from "../demo/DemoContext";

const ICONS = {
  bill: "receipt-outline",
  payment: "card-outline",
  booking: "calendar-outline",
  notice: "megaphone-outline",
  violation: "alert-circle-outline",
  support: "chatbubbles-outline",
  renewal: "refresh-outline",
  welcome: "sparkles-outline",
  expiry: "time-outline",
  account: "person-outline",
};

// Day heading for a notification ("Today" / "Yesterday" / "Earlier"), from its createdAt in local time.
function dayGroup(createdAt) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Earlier";
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(date)) / 86400000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : "Earlier";
}

// Splits the list into consecutive runs by day heading — display only: the order is exactly the list's own.
function groupByDay(notifications) {
  const groups = [];
  notifications.forEach((notification) => {
    const label = dayGroup(notification.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(notification);
    else groups.push({ label, items: [notification] });
  });
  return groups;
}

function NotificationRow({ notification, read, onPress, first }) {
  const { colors } = useTheme();

  const content = (
    <>
      {/* Unread: a crimson rail on the leading edge, plus the tint, dot and bold title. */}
      {read ? null : (
        <View style={{ position: "absolute", left: 0, top: 14, bottom: 14, width: 3, borderRadius: 2, backgroundColor: colors.highlight }} />
      )}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: read ? colors.surfaceMuted : colors.primarySoft,
          borderWidth: read ? 1 : 0,
          borderColor: colors.surfaceBorder,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
        }}
      >
        <Ionicons
          name={ICONS[notification.type] ?? "notifications-outline"}
          size={20}
          color={read ? colors.textMuted : colors.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
          <Text
            style={{
              flex: 1,
              color: read ? colors.textSecondary : colors.text,
              fontSize: 15,
              lineHeight: 21,
              fontWeight: read ? "500" : "700",
            }}
          >
            {notification.title}
          </Text>
          {read ? null : (
            <View
              accessibilityLabel="Unread"
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.highlight, marginLeft: 8 }}
            />
          )}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 6 }}>{notification.body}</Text>
        <Text style={[TYPE.caption, { color: colors.textSubtle }]}>
          {formatTimestamp(notification.createdAt)}
          {notification.demo ? " · Demo" : ""}
        </Text>
      </View>
      {notification.target ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} style={{ marginLeft: 8, alignSelf: "center" }} />
      ) : null}
    </>
  );

  // A row of the grouped list: unread rows carry a soft brand tint; rows are split by hairlines.
  const rowStyle = {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: read ? "transparent" : colors.primaryTint,
    padding: 16,
  };
  const dividerStyle = { borderTopWidth: first ? 0 : 1, borderTopColor: colors.divider };

  // An already-read notice with nowhere to go has nothing to do on tap, so it isn't tappable.
  if (read && !notification.target) {
    return <View style={[rowStyle, dividerStyle]}>{content}</View>;
  }

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${read ? "" : "Unread: "}${notification.title}`}
      containerStyle={dividerStyle}
      style={rowStyle}
    >
      {content}
    </PressableScale>
  );
}

export default function NotificationsScreen({ navigation }) {
  const { colors } = useTheme();
  const card = useCardStyle();
  const { userState } = useDemo();
  const loadNotifications = useCallback(() => fetchNotifications(userState), [userState]);
  const { loading, data: notifications, error, reload } = useAsync(loadNotifications);
  const markAll = useSubmit(markAllNotificationsRead);

  // Read state is applied locally straight away; the API calls only persist it.
  const [readIds, setReadIds] = useState(() => new Set());
  const [allRead, setAllRead] = useState(false);
  const isRead = (n) => allRead || n.read || readIds.has(n.id);

  const openNotification = (notification) => {
    if (!isRead(notification)) {
      setReadIds((ids) => new Set(ids).add(notification.id));
      markNotificationRead(notification.id).catch(() => {}); // best effort — a missed mark isn't worth an error
    }
    if (notification.target) navigation.navigate(notification.target.screen, notification.target.params);
  };

  const onMarkAll = async () => {
    if (await markAll.submit(userState)) setAllRead(true);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <SkeletonCard style={{ padding: 0 }}>
          {[0, 1, 2].map((key) => (
            <View
              key={key}
              style={{
                padding: 16,
                flexDirection: "row",
                borderTopWidth: key === 0 ? 0 : 1,
                borderTopColor: colors.divider,
              }}
            >
              <Skeleton width={40} height={40} radius={20} style={{ marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
                <Skeleton width="90%" height={12} style={{ marginBottom: 6 }} />
                <Skeleton width="30%" height={10} />
              </View>
            </View>
          ))}
        </SkeletonCard>
      );
    }
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load your notifications"
          message={errorMessage(error)}
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }
    if (notifications.length === 0) {
      return (
        <EmptyState
          icon="notifications-outline"
          title="You're all caught up"
          message="Updates on your contracts, bills and bookings will appear here."
        />
      );
    }

    const unreadCount = notifications.filter((n) => !isRead(n)).length;
    return (
      <View>
        {unreadCount > 0 ? (
          <View style={{ marginTop: -16, marginBottom: 8 }}>
            <TextLink align="right" onPress={onMarkAll}>
              <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: "600" }}>
                {markAll.loading ? "Marking as read…" : "Mark all as read"}
              </Text>
            </TextLink>
            <ErrorBanner message={markAll.error} onRetry={onMarkAll} />
          </View>
        ) : null}
        {/* Existing User notifications are demo (services/notificationService.js) — never presented as sent by MAZ. */}
        {notifications.some((n) => n.demo) ? (
          <InfoNote boxed style={{ marginBottom: 24 }}>
            {NOTIFICATIONS_DEMO_NOTE}
          </InfoNote>
        ) : null}
        {groupByDay(notifications).map((group, groupIndex) => (
          <FadeIn key={`${group.label}-${groupIndex}`} index={groupIndex} style={{ marginBottom: 24 }}>
            <SectionHeading>{group.label}</SectionHeading>
            <View style={card}>
              <View style={{ borderRadius: RADIUS.card - 1, overflow: "hidden" }}>
                {group.items.map((notification, index) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    read={isRead(notification)}
                    first={index === 0}
                    onPress={() => openNotification(notification)}
                  />
                ))}
              </View>
            </View>
          </FadeIn>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />
          <ScreenTitle title="Notifications" subtitle="Updates on your contracts, bills and requests." />
          {renderContent()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
