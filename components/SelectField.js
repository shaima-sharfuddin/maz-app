import { useMemo, useState } from "react";
import { View, Text, Pressable, Modal, FlatList, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Lists longer than this get a search box.
const SEARCH_THRESHOLD = 10;

export default function SelectField({ label, value, onChange, options, placeholder = "Select an option" }) {
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
      <Text style={{ color: "#cbd5e1", fontSize: 13, marginBottom: 8 }}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.08)",
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderWidth: 1.5,
          borderColor: open ? "#a31c37" : "rgba(255,255,255,0.1)",
        }}
      >
        <Text style={{ flex: 1, color: value ? "#ffffff" : "#64748b", fontSize: 14 }}>
          {value || placeholder}
        </Text>
        <Text style={{ color: "#94a3b8", fontSize: 12 }}>{"▼"}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close" />
          <View
            style={{
              maxHeight: "70%",
              backgroundColor: "#101828",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              paddingTop: 16,
              paddingBottom: insets.bottom + 8,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 12 }}>
              <Text style={{ flex: 1, color: "#ffffff", fontSize: 16, fontWeight: "600" }}>{label}</Text>
              <Pressable onPress={close} hitSlop={8}>
                <Text style={{ color: "#94a3b8", fontSize: 14 }}>Cancel</Text>
              </Pressable>
            </View>

            {searchable ? (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor="#64748b"
                autoCorrect={false}
                style={{
                  marginHorizontal: 20,
                  marginBottom: 8,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  color: "#ffffff",
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
                  <Pressable
                    onPress={() => select(item)}
                    style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14 }}
                  >
                    <Text style={{ flex: 1, color: selected ? "#ffffff" : "#cbd5e1", fontSize: 15, fontWeight: selected ? "600" : "400" }}>
                      {item}
                    </Text>
                    {selected ? <Text style={{ color: "#a31c37", fontSize: 16 }}>{"✓"}</Text> : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text style={{ color: "#64748b", fontSize: 14, paddingHorizontal: 20, paddingVertical: 14 }}>
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
