import { useCallback } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import EmptyState from "../components/EmptyState";
import PressableScale from "../components/PressableScale";
import StatusBadge from "../components/StatusBadge";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import { fetchEnquiries, errorMessage } from "../services/api";
import { formatTimestamp } from "../utils/formatDate";
import SectionHeading from "../components/SectionHeading";
import { useTheme } from "../theme/ThemeContext";
import { useDemo } from "../demo/DemoContext";

function EnquiryRow({ enquiry, onPress }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${enquiry.subject}, ${enquiry.status}`}
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
      <View style={{ flex: 1, marginRight: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{enquiry.subject}</Text>
          <StatusBadge status={enquiry.status} />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>
          {enquiry.category} · {formatTimestamp(enquiry.createdAt)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </PressableScale>
  );
}

export default function SupportScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { userState } = useDemo();
  const submitted = route.params?.submitted; // set by NewEnquiry after a successful submit
  const loadEnquiries = useCallback(() => fetchEnquiries(userState), [userState]);
  const { loading, data: enquiries, error, reload } = useAsync(loadEnquiries);

  const renderEnquiries = () => {
    if (loading) {
      return [0, 1].map((key) => (
        <SkeletonCard key={key} style={{ padding: 16, marginBottom: 10 }}>
          <Skeleton width="55%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="75%" height={12} />
        </SkeletonCard>
      ));
    }
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load your enquiries"
          message={errorMessage(error)}
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }
    if (enquiries.length === 0) {
      return (
        <EmptyState
          icon="chatbubbles-outline"
          title="No enquiries yet"
          message="Questions about billing, your contract or facilities? Our team is here to help."
        />
      );
    }
    return enquiries.map((enquiry) => (
      <EnquiryRow
        key={enquiry.id}
        enquiry={enquiry}
        onPress={() => navigation.navigate("EnquiryDetail", { enquiryId: enquiry.id })}
      />
    ));
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />
          <ScreenTitle
            title="Support"
            subtitle="Our client services team is at your disposal for anything you need."
          />

          {submitted ? (
            <Text className="text-sm mb-4" style={{ color: colors.success }}>
              {"✓"} Enquiry sent — we&apos;ll reply by email and here.
            </Text>
          ) : null}

          <View className="mb-8">
            <AnimatedButton label="New enquiry" onPress={() => navigation.navigate("NewEnquiry")} />
          </View>

          <SectionHeading>Your enquiries</SectionHeading>
          {renderEnquiries()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
