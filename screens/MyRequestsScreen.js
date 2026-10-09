import { useCallback, useRef } from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import EmptyState from "../components/EmptyState";
import RequestRow from "../components/RequestRow";
import StaleDataNote from "../components/StaleDataNote";
import ScreenTitle from "../components/ScreenTitle";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import { fetchRequests, errorMessage } from "../services/api";
import { useTheme } from "../theme/ThemeContext";

// Every office request the user has submitted, newest first → RequestStatus. fetchRequests is MOCK (the
// in-memory request store, cleared on reload) until the real requests endpoint exists — see CLAUDE.md.
export default function MyRequestsScreen({ navigation }) {
  const { colors } = useTheme();
  // keepData: refreshed on focus (e.g. after paying), without flashing the skeleton.
  // keepDataOnError: a failed refresh keeps the list on screen, marked as earlier information (read-only rows).
  const { loading, data: requests, error, stale, reload } = useAsync(fetchRequests, { keepData: true, keepDataOnError: true });

  const skipFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocus.current) {
        skipFirstFocus.current = false;
        return;
      }
      reload();
    }, [reload])
  );

  const renderList = () => {
    if (loading && !requests) {
      return [0, 1, 2].map((key) => (
        <SkeletonCard key={key} style={{ padding: 16, marginBottom: 16 }}>
          <Skeleton width="60%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="85%" height={12} />
        </SkeletonCard>
      ));
    }
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load your requests"
          message={errorMessage(error)}
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }
    if (requests.length === 0) {
      return (
        <EmptyState
          icon="document-text-outline"
          title="No requests yet"
          message="When you request a workspace, you can follow its progress here."
        >
          <AnimatedButton label="Explore services" onPress={() => navigation.navigate("BrowsePlans")} />
        </EmptyState>
      );
    }
    const rows = requests.map((request) => (
      <RequestRow
        key={request.requestId}
        request={request}
        showId
        style={{ marginBottom: 16 }}
        onPress={() => navigation.navigate("RequestStatus", { requestId: request.requestId, summary: request.summary })}
      />
    ));
    return (
      <>
        {stale ? <StaleDataNote onRetry={reload} style={{ marginTop: 0, marginBottom: 12 }} /> : null}
        {rows}
      </>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />
          <ScreenTitle title="My requests" subtitle="Your workspace requests and where each one stands." />
          {renderList()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
