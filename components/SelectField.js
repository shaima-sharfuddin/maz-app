import { useMemo, useState } from "react";
import { View, Text, Pressable, Modal, FlatList, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PressableScale from "./PressableScale";
import FieldError from "./FieldError";
import { useTheme } from "../theme/ThemeContext";

// `onBlur` fires when the sheet closes (so form validation treats the field as touched);
// `error` shows an inline message + danger border.
// `options` are strings (value = label) or { value, label } — e.g. an enum code with its label,
// where the form stores the code ("p") and the field shows the label ("Partner").
const normalize = (option) => (typeof option === "string" ? { value: option, label: option } : option);

// `compact` (e.g. the country-code half of the Mobile Number field): no label above, no bottom margin and no
// inline error — the parent shows those; `label` still titles the sheet. `formatSelected(value)` replaces the
// selected option's label in the field itself (e.g. "🇦🇪 +971" for "🇦🇪  United Arab Emirates  +971").

// Lists longer than this get a search box.
const SEARCH_THRESHOLD = 10;

export default function SelectField({
  label,
  value,
  onChange,
  onBlur,
  error,
  options,
  placeholder = "Select an option",
  compact = false,
  formatSelected,
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const insets = useSafeAreaInsets();

  const items = useMemo(() => options.map(normalize), [options]);
  const selectedItem = items.find((item) => item.value === value);
  const selectedLabel = selectedItem && formatSelected ? formatSelected(selectedItem.value) : (selectedItem?.label ?? value);

  const searchable = items.length > SEARCH_THRESHOLD;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((item) => item.label.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
    onBlur?.();
  };

  const select = (item) => {
    onChange(item.value);
    close();
  };

  return (
    <View style={{ marginBottom: compact ? 0 : 20 }}>
      {compact ? null : <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>{label}</Text>}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedLabel || "not selected"}`}
        accessibilityHint={error || undefined}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.inputBackground,
          borderRadius: 12,
          paddingHorizontal: compact ? 12 : 16,
          paddingVertical: 12,
          minHeight: 48,
          borderWidth: 1.5,
          borderColor: error ? colors.danger : open ? colors.primary : colors.inputBorder,
        }}
      >
        <Text style={[{ color: value ? colors.text : colors.textSubtle, fontSize: 14 }, compact ? { marginRight: 8 } : { flex: 1 }]}>
          {selectedLabel || placeholder}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{"▼"}</Text>
      </Pressable>
      {compact ? null : <FieldError message={error} />}

      {/* Translucent bars (Android): the backdrop covers the full screen; the sheet pads by insets.bottom. */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "flex-end", backgroundColor: colors.backdrop }}
        >
          <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close" />
          <View
            style={{
              maxHeight: "70%",
              backgroundColor: colors.sheet,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderWidth: 1,
              borderColor: colors.surfaceBorder,
              paddingTop: 16,
              paddingBottom: insets.bottom + 8,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 12 }}>
              <Text style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: "600" }}>{label}</Text>
              <PressableScale
                onPress={close}
                accessibilityRole="button"
                style={{ minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "flex-end" }}
              >
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>Cancel</Text>
              </PressableScale>
            </View>

            {searchable ? (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor={colors.textSubtle}
                selectionColor={colors.primary}
                autoCorrect={false}
                style={{
                  marginHorizontal: 20,
                  marginBottom: 8,
                  backgroundColor: colors.inputBackground,
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }}
              />
            ) : null}

            <FlatList
              data={filtered}
              keyExtractor={(item) => String(item.value)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = item.value === value;
                return (
                  <PressableScale
                    onPress={() => select(item)}
                    scaleTo={0.98}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, minHeight: 48 }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        color: selected ? colors.text : colors.textSecondary,
                        fontSize: 15,
                        fontWeight: selected ? "600" : "400",
                      }}
                    >
                      {item.label}
                    </Text>
                    {selected ? <Text style={{ color: colors.primary, fontSize: 16 }}>{"✓"}</Text> : null}
                  </PressableScale>
                );
              }}
              ListEmptyComponent={
                <Text style={{ color: colors.textSubtle, fontSize: 14, paddingHorizontal: 20, paddingVertical: 14 }}>
                  No matches
                </Text>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
