import { useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import PressableScale from "./PressableScale";
import FieldError from "./FieldError";
import { useTheme } from "../theme/ThemeContext";
import { formatDate } from "../utils/formatDate";

// `onBlur` fires when the picker closes (the field's equivalent of losing focus), so form
// validation treats the field as touched. `error` shows an inline message + danger border.
export default function DateField({
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder = "Select a date",
  minimumDate,
  maximumDate,
}) {
  const { colors, scheme } = useTheme();
  // iOS only: the picker renders inline below the field while open.
  const [open, setOpen] = useState(false);

  const closeIOS = () => {
    setOpen(false);
    onBlur?.();
  };

  const handlePress = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: value ?? new Date(),
        mode: "date",
        minimumDate,
        maximumDate,
        onValueChange: (_event, date) => {
          onChange(date);
          onBlur?.();
        },
        onDismiss: () => onBlur?.(),
      });
    } else if (open) {
      closeIOS();
    } else {
      setOpen(true);
    }
  };

  const borderColor = error ? colors.danger : open ? colors.primary : colors.inputBorder;

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>{label}</Text>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatDate(value) : "not set"}`}
        accessibilityHint={error || undefined}
        style={{
          backgroundColor: colors.inputBackground,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          minHeight: 48,
          justifyContent: "center",
          borderWidth: 1.5,
          borderColor,
        }}
      >
        <Text style={{ color: value ? colors.text : colors.textSubtle, fontSize: 14 }}>
          {value ? formatDate(value) : placeholder}
        </Text>
      </Pressable>
      <FieldError message={error} />

      {open && Platform.OS === "ios" ? (
        <View style={{ marginTop: 8 }}>
          <DateTimePicker
            value={value ?? new Date()}
            mode="date"
            display="spinner"
            themeVariant={scheme}
            textColor={colors.text}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onValueChange={(_event, date) => onChange(date)}
          />
          <PressableScale
            onPress={closeIOS}
            accessibilityRole="button"
            containerStyle={{ alignSelf: "flex-end" }}
            style={{ minHeight: 44, minWidth: 44, justifyContent: "center", paddingHorizontal: 8 }}
          >
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>Done</Text>
          </PressableScale>
        </View>
      ) : null}
    </View>
  );
}
