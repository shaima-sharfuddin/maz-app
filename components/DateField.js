import { useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  return `${day} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export default function DateField({
  label,
  value,
  onChange,
  placeholder = "Select a date",
  minimumDate,
  maximumDate,
}) {
  // iOS only: the picker renders inline below the field while open.
  const [open, setOpen] = useState(false);

  const handlePress = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: value ?? new Date(),
        mode: "date",
        minimumDate,
        maximumDate,
        onValueChange: (_event, date) => onChange(date),
      });
    } else {
      setOpen((prev) => !prev);
    }
  };

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ color: "#cbd5e1", fontSize: 13, marginBottom: 8 }}>{label}</Text>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        style={{
          backgroundColor: "rgba(255,255,255,0.08)",
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderWidth: 1.5,
          borderColor: open ? "#a31c37" : "rgba(255,255,255,0.1)",
        }}
      >
        <Text style={{ color: value ? "#ffffff" : "#64748b", fontSize: 14 }}>
          {value ? formatDate(value) : placeholder}
        </Text>
      </Pressable>

      {open && Platform.OS === "ios" ? (
        <View style={{ marginTop: 8 }}>
          <DateTimePicker
            value={value ?? new Date()}
            mode="date"
            display="spinner"
            themeVariant="dark"
            textColor="#ffffff"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onValueChange={(_event, date) => onChange(date)}
          />
          <Pressable onPress={() => setOpen(false)} style={{ alignItems: "flex-end", paddingVertical: 8 }}>
            <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "600" }}>Done</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
