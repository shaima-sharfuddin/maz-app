import { useMemo, useState } from "react";
import { View, Text, Pressable, Modal, FlatList, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PressableScale from "./PressableScale";
import { useTheme } from "../theme/ThemeContext";

// Lists longer than this get a search box.
const SEARCH_THRESHOLD = 10;

export default function SelectField({ label, value, onChange, options, placeholder = "Select an option" }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const insets = useSafeAreaInsets();

  const searchable = options.length > SEARCH_THRESHOLD;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((option) => option.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const select = (option) => {
    onChange(option);
    close();
  };

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.inputBackground,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          minHeight: 48,
          borderWidth: 1.5,
          borderColor: open ? colors.primary : colors.inputBorder,
        }}
      >
        <Text style={{ flex: 1, color: value ? colors.text : colors.textSubtle, fontSize: 14 }}>
          {value || placeholder}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{"▼"}</Text>
      </Pressable>

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
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = item === value;
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
                      {item}
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
