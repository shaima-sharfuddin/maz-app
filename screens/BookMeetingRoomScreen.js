import { useCallback, useEffect, useMemo } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useWatch } from "react-hook-form";
import AnimatedButton from "../components/AnimatedButton";
import StyledInput from "../components/StyledInput";
import DateField from "../components/DateField";
import SegmentedControl from "../components/SegmentedControl";
import SlotPicker from "../components/SlotPicker";
import FormField from "../components/FormField";
import ErrorBanner from "../components/ErrorBanner";
import EmptyState from "../components/EmptyState";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import { Skeleton } from "../components/Skeleton";
import useZodForm from "../hooks/useZodForm";
import useSubmit from "../hooks/useSubmit";
import useAsync from "../hooks/useAsync";
import { bookingSchema } from "../validation/schemas";
import { bookMeetingRoom, fetchRoomAvailability } from "../services/api";
import { DURATION_OPTIONS, BOOKING_WINDOW_DAYS, formatHours } from "../data/meetingRooms";
import { formatDate, formatTime, toISODate } from "../utils/formatDate";
import { useTheme } from "../theme/ThemeContext";

const DURATION_SEGMENTS = DURATION_OPTIONS.map((hours) => ({ value: hours, label: formatHours(hours) }));

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const lastBookableDay = () => {
  const d = startOfToday();
  d.setDate(d.getDate() + BOOKING_WINDOW_DAYS);
  return d;
};
const addHours = (start, hours) => `${String(Number(start.slice(0, 2)) + hours).padStart(2, "0")}:00`;

// route.params.room: the room chosen on MeetingRooms ({ id, name, capacity, description }).
export default function BookMeetingRoomScreen({ navigation, route }) {
  const { colors } = useTheme();
  const room = route.params?.room;

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isValid },
  } = useZodForm(bookingSchema, { date: startOfToday(), start: "", durationHours: 1, notes: "" });
  const [date, start, durationHours] = useWatch({ control, name: ["date", "start", "durationHours"] });
  const isoDate = date ? toISODate(date) : null;

  const loadAvailability = useCallback(
    () => fetchRoomAvailability(room?.id, isoDate),
    [room?.id, isoDate]
  );
  const availability = useAsync(loadAvailability);
  const { submit, loading, error, errorCode } = useSubmit(bookMeetingRoom);

  // A start time is only offered if every hour of the chosen duration is free.
  const slots = useMemo(() => {
    const hours = availability.data?.slots ?? [];
    return hours.map((slot, index) => ({
      value: slot.start,
      label: formatTime(slot.start),
      disabled: !hours.slice(index, index + durationHours).every((s) => s.available) || index + durationHours > hours.length,
    }));
  }, [availability.data, durationHours]);
  const hasFreeSlot = slots.some((slot) => !slot.disabled);

  // Changing the date or duration can make the chosen start impossible — clear it rather than keep a stale pick.
  useEffect(() => {
    if (!start || !availability.data) return;
    const stillFree = slots.some((slot) => slot.value === start && !slot.disabled);
    if (!stillFree) setValue("start", "", { shouldValidate: true });
  }, [slots, start, availability.data, setValue]);

  // Someone else took the slot between loading and booking: refresh the grid so it's shown as taken.
  const reloadAvailability = availability.reload;
  useEffect(() => {
    if (errorCode === "SLOT_TAKEN") reloadAvailability();
  }, [errorCode, reloadAvailability]);

  const onSubmit = handleSubmit(async (values) => {
    const result = await submit({
      roomId: room.id,
      date: toISODate(values.date),
      start: values.start,
      durationHours: values.durationHours,
      notes: values.notes,
    });
    if (result) {
      navigation.reset({
        index: 1,
        routes: [{ name: "HomeDashboard" }, { name: "MeetingRooms", params: { bookedId: result.id } }],
      });
    }
  });

  const renderSlots = () => {
    if (availability.loading) {
      return (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {Array.from({ length: 9 }, (_, key) => (
            <View key={key} style={{ flexBasis: "30%", flexGrow: 1 }}>
              <Skeleton height={44} radius={12} />
            </View>
          ))}
        </View>
      );
    }
    if (availability.error) {
      return (
        <View style={{ marginBottom: 20 }}>
          <EmptyState icon="cloud-offline-outline" title="We couldn't load availability" message="Please try again.">
            <AnimatedButton label="Try again" onPress={availability.reload} />
          </EmptyState>
        </View>
      );
    }
    if (!hasFreeSlot) {
      return (
        <View style={{ marginBottom: 20 }}>
          <EmptyState
            icon="calendar-outline"
            title="Fully booked"
            message={`No ${formatHours(durationHours)} slot is free on this date. Try another day or a shorter duration.`}
          />
        </View>
      );
    }
    return <FormField control={control} name="start" component={SlotPicker} slots={slots} />;
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-10">
            <BackButton onPress={() => navigation.goBack()} />

            <ScreenTitle
              eyebrow={room ? `Up to ${room.capacity} guests` : undefined}
              title={room?.name ?? "Book a meeting room"}
              subtitle="Choose a date, duration and start time."
            />

            <FormField
              control={control}
              name="date"
              component={DateField}
              label="Date *"
              minimumDate={startOfToday()}
              maximumDate={lastBookableDay()}
            />
            <FormField
              control={control}
              name="durationHours"
              component={SegmentedControl}
              label="Duration"
              options={DURATION_SEGMENTS}
            />

            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>Start time *</Text>
            {renderSlots()}

            <FormField
              control={control}
              name="notes"
              component={StyledInput}
              label="Notes"
              placeholder="Catering, equipment or other requests (optional)"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 88 }}
            />

            <Text
              className="text-sm text-center mb-4"
              style={{ color: start ? colors.text : colors.textMuted, fontWeight: start ? "600" : "400" }}
            >
              {start && date
                ? `${formatDate(date)} · ${formatTime(start)} – ${formatTime(addHours(start, durationHours))}`
                : "Select a start time to continue"}
            </Text>

            <AnimatedButton
              label={loading ? "Booking…" : "Confirm booking"}
              onPress={onSubmit}
              disabled={!isValid || availability.loading}
              loading={loading}
            />
            {/* Retrying a taken slot can't succeed — the refreshed grid is the way forward instead. */}
            <ErrorBanner message={error} onRetry={errorCode === "SLOT_TAKEN" ? undefined : onSubmit} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
