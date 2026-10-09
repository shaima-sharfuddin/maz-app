import { useCallback, useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import PressableScale from "../components/PressableScale";
import StatusBadge from "../components/StatusBadge";
import TextLink from "../components/TextLink";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import useSubmit from "../hooks/useSubmit";
import { cancelBooking, fetchBookings, fetchMeetingRooms, errorMessage } from "../services/api";
import { formatDate, formatTime } from "../utils/formatDate";
import SectionHeading from "../components/SectionHeading";
import { useTheme } from "../theme/ThemeContext";
import { useDemo } from "../demo/DemoContext";

function BookingRow({ booking, onCancelled }) {
  const { colors } = useTheme();
  const { submit, loading, error } = useSubmit(cancelBooking);
  const when = `${formatDate(booking.date)} · ${formatTime(booking.start)} – ${formatTime(booking.end)}`;

  const doCancel = async () => {
    if (await submit(booking.id)) onCancelled();
  };

  const confirmCancel = () =>
    Alert.alert("Cancel this booking?", `${booking.roomName}\n${when}`, [
      { text: "Keep booking", style: "cancel" },
      { text: "Cancel booking", style: "destructive", onPress: doCancel },
    ]);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 4,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{booking.roomName}</Text>
        <StatusBadge status={booking.status} />
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>{when}</Text>
      {booking.notes ? (
        <Text style={{ color: colors.textSubtle, fontSize: 13, lineHeight: 18, marginTop: 4 }}>{booking.notes}</Text>
      ) : null}
      <TextLink align="left" onPress={loading ? undefined : confirmCancel} style={{ marginTop: 4 }}>
        <Text style={{ color: colors.danger, fontSize: 14, fontWeight: "600" }}>
          {loading ? "Cancelling…" : "Cancel booking"}
        </Text>
      </TextLink>
      {error ? (
        <View style={{ marginTop: -8, marginBottom: 12 }}>
          <ErrorBanner message={error} onRetry={doCancel} />
        </View>
      ) : null}
    </View>
  );
}

function RoomCard({ room, onPress }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`Book ${room.name}, up to ${room.capacity} guests`}
      containerStyle={{ marginBottom: 10 }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderRadius: 16,
        padding: 16,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.primarySoft,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
        }}
      >
        <Ionicons name="people-outline" size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 2 }}>{room.name}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>Up to {room.capacity} guests</Text>
        <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>{room.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </PressableScale>
  );
}

const listSkeleton = (count) =>
  Array.from({ length: count }, (_, key) => (
    <SkeletonCard key={key} style={{ padding: 16, marginBottom: 10 }}>
      <Skeleton width="50%" height={16} style={{ marginBottom: 8 }} />
      <Skeleton width="80%" height={12} />
    </SkeletonCard>
  ));

const loadError = (title, onRetry, error) => (
  <EmptyState icon="cloud-offline-outline" title={title} message={errorMessage(error)}>
    <AnimatedButton label="Try again" onPress={onRetry} />
  </EmptyState>
);

export default function MeetingRoomsScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { userState } = useDemo();
  const justBooked = Boolean(route.params?.bookedId); // set by BookMeetingRoom after a successful booking
  const [justCancelled, setJustCancelled] = useState(false);

  const loadBookings = useCallback(() => fetchBookings(userState), [userState]);
  const bookings = useAsync(loadBookings);
  const rooms = useAsync(fetchMeetingRooms);

  const onCancelled = () => {
    setJustCancelled(true);
    bookings.reload();
  };

  const renderBookings = () => {
    if (bookings.loading) return listSkeleton(1);
    if (bookings.error) return loadError("We couldn't load your bookings", bookings.reload, bookings.error);
    if (bookings.data.length === 0) {
      return (
        <EmptyState
          dashed
          icon="calendar-outline"
          title="No upcoming bookings"
          message="Reserve a boardroom or conference suite below."
        />
      );
    }
    return bookings.data.map((booking) => <BookingRow key={booking.id} booking={booking} onCancelled={onCancelled} />);
  };

  const renderRooms = () => {
    if (rooms.loading) return listSkeleton(3);
    if (rooms.error) return loadError("We couldn't load meeting rooms", rooms.reload, rooms.error);
    return rooms.data.map((room) => (
      <RoomCard key={room.id} room={room} onPress={() => navigation.navigate("BookMeetingRoom", { room })} />
    ));
  };

  const successMessage = justCancelled ? "Booking cancelled." : justBooked ? "Booking confirmed — see you soon." : null;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />
          <ScreenTitle
            title="Meeting rooms"
            subtitle="Marble boardrooms and intimate conference suites, reserved in moments."
          />

          {successMessage ? (
            <Text className="text-sm mb-4" style={{ color: colors.success }}>
              {"✓"} {successMessage}
            </Text>
          ) : null}

          <SectionHeading>Your upcoming bookings</SectionHeading>
          <View className="mb-8">{renderBookings()}</View>

          <SectionHeading>Book a room</SectionHeading>
          {renderRooms()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
