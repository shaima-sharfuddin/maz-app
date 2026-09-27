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
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "../services/api";
import { formatTimestamp } from "../utils/formatDate";
import { useTheme } from "../theme/ThemeContext";
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
};

function NotificationRow({ notification, read, onPress }) {
  const { colors } = useTheme();

  const content = (
    <>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.primarySoft,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
        }}
      >
        <Ionicons name={ICONS[notification.type] ?? "notifications-outline"} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
          <Text style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: read ? "500" : "700" }}>
            {notification.title}
          </Text>
          {read ? null : (
            <View
              accessibilityLabel="Unread"
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginLeft: 8 }}
            />
          )}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 6 }}>{notification.body}</Text>
        <Text style={{ color: colors.textSubtle, fontSize: 12 }}>{formatTimestamp(notification.createdAt)}</Text>
      </View>
      {notification.target ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} style={{ marginLeft: 8, alignSelf: "center" }} />
      ) : null}
    </>
  );

  const rowStyle = {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: read ? colors.surface : colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 16,
    padding: 16,
  };

  // An already-read notice with nowhere to go has nothing to do on tap, so it isn't tappable.
  if (read && !notification.target) {
    return <View style={[rowStyle, { marginBottom: 10 }]}>{content}</View>;
  }

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${read ? "" : "Unread: "}${notification.title}`}
      containerStyle={{ marginBottom: 10 }}
      style={rowStyle}
    >
      {content}
    </PressableScale>
  );
}

export default function NotificationsScreen({ navigation }) {
  const { colors } = useTheme();
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
      return [0, 1, 2].map((key) => (
        <SkeletonCard key={key} style={{ padding: 16, marginBottom: 10, flexDirection: "row" }}>
          <Skeleton width={40} height={40} radius={20} style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
            <Skeleton width="90%" height={12} style={{ marginBottom: 6 }} />
            <Skeleton width="30%" height={10} />
          </View>
        </SkeletonCard>
      ));
    }
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load your notifications"
          message="Please check your connection and try again."
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
        {notifications.map((notification) => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            read={isRead(notification)}
            onPress={() => openNotification(notification)}
          />
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
