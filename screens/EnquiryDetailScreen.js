import { useCallback } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import DetailCard from "../components/DetailCard";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import { fetchEnquiry, errorMessage } from "../services/api";
import { formatTimestamp } from "../utils/formatDate";
import { useTheme } from "../theme/ThemeContext";

function MessageCard({ title, author, date, body }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 4 }}>{title}</Text>
      <Text style={{ color: colors.textSubtle, fontSize: 12, marginBottom: 12 }}>
        {author} · {formatTimestamp(date)}
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 21 }}>{body}</Text>
    </View>
  );
}

export default function EnquiryDetailScreen({ navigation, route }) {
  const { colors } = useTheme();
  const enquiryId = route.params?.enquiryId;
  const loadEnquiry = useCallback(() => fetchEnquiry(enquiryId), [enquiryId]);
  const { loading, data: enquiry, error, reload } = useAsync(loadEnquiry);

  const renderContent = () => {
    if (loading) {
      return (
        <View>
          <Skeleton width="30%" height={12} style={{ marginBottom: 10 }} />
          <Skeleton width="70%" height={26} style={{ marginBottom: 32 }} />
          {[0, 1].map((key) => (
            <SkeletonCard key={key} style={{ marginBottom: 16 }}>
              <Skeleton width="40%" height={16} style={{ marginBottom: 14 }} />
              <Skeleton width="90%" height={12} style={{ marginBottom: 8 }} />
              <Skeleton width="70%" height={12} />
            </SkeletonCard>
          ))}
        </View>
      );
    }
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load this enquiry"
          message={errorMessage(error)}
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }

    return (
      <View>
        <ScreenTitle eyebrow={`Enquiry ${enquiry.id}`} title={enquiry.subject} />

        <DetailCard
          rows={[
            { label: "Status", value: <StatusBadge status={enquiry.status} /> },
            { label: "Category", value: enquiry.category },
            { label: "Contract", value: enquiry.contractId ?? "Not specified" },
            { label: "Sent", value: formatTimestamp(enquiry.createdAt) },
          ]}
        />

        <MessageCard title="Your message" author="You" date={enquiry.createdAt} body={enquiry.message} />

        {enquiry.reply ? (
          <MessageCard
            title="Reply from MAZ"
            author={enquiry.reply.from}
            date={enquiry.reply.createdAt}
            body={enquiry.reply.body}
          />
        ) : (
          <EmptyState
            dashed
            icon="time-outline"
            title="Awaiting reply"
            message="Our client services team will reply by email and here."
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />
          {renderContent()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
