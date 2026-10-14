import { useState } from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import ContractRow from "../components/ContractRow";
import EmptyState from "../components/EmptyState";
import ScreenTitle from "../components/ScreenTitle";
import SegmentedControl from "../components/SegmentedControl";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import { fetchContracts, errorMessage } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import FadeIn from "../components/FadeIn";
import { isTabRoot } from "../utils/navigation";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
];

const EMPTY_MESSAGES = {
  all: { title: "No contracts yet", message: "Your contracts with MAZ will appear here." },
  active: { title: "No active contracts", message: "Contracts that are currently active will appear here." },
  expired: { title: "No expired contracts", message: "Contracts that have ended will appear here." },
};

// Dashboard → Contracts card → here → Contract Details. Every contract of the logged-in customer, from the REAL
// MAZ contracts API (services/contractService.js). `filter` param ("all" | "active" | "expired") preselects a tab.
// Statuses are MAZ's own (data/enums.js CONTRACT_STATUS); "All" also lists draft / reviewing / renewed / terminated.
export default function ContractListScreen({ navigation, route }) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState(route.params?.filter ?? "all");
  const { loading, data: contracts, error, reload } = useAsync(fetchContracts);

  const renderList = () => {
    if (loading) {
      return [0, 1, 2].map((key) => (
        <SkeletonCard key={key} style={{ padding: 16, marginBottom: 12, flexDirection: "row" }}>
          <Skeleton width={44} height={44} radius={12} style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <Skeleton width="45%" height={12} style={{ marginBottom: 8 }} />
            <Skeleton width="60%" height={16} style={{ marginBottom: 8 }} />
            <Skeleton width="85%" height={12} />
          </View>
        </SkeletonCard>
      ));
    }
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="We couldn't load your contracts"
          message={errorMessage(error)}
        >
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }
    const shown = filter === "all" ? contracts : contracts.filter((contract) => contract.status === filter);
    if (shown.length === 0) {
      const { title, message } = EMPTY_MESSAGES[filter];
      return <EmptyState icon="document-text-outline" title={title} message={message} />;
    }
    return shown.map((contract, index) => (
      <FadeIn key={contract.id} index={index}>
        <ContractRow
          contract={contract}
          onPress={() => navigation.navigate("ContractDetail", { contractId: contract.id })}
        />
      </FadeIn>
    ));
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          {isTabRoot(navigation) ? null : <BackButton onPress={() => navigation.goBack()} />}
          <ScreenTitle title="Your contracts" subtitle="Your contracts with MAZ Business Center." />
          <SegmentedControl value={filter} onChange={setFilter} options={FILTERS} />
          {renderList()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
