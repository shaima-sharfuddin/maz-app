import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "../components/AnimatedButton";
import BackButton from "../components/BackButton";
import ScreenTitle from "../components/ScreenTitle";
import EmptyState from "../components/EmptyState";
import InfoNote from "../components/InfoNote";
import SectionHeading from "../components/SectionHeading";
import FadeIn from "../components/FadeIn";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import useAsync from "../hooks/useAsync";
import { fetchViolationTypes, errorMessage } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";
import { RADIUS, TYPE } from "../theme/theme";

// MAZ's catalogue of violation TYPES — REAL data from GET /violations (services/violationService.js
// fetchViolationTypes). A reference list only: these are categories, NOT notices issued to the customer — the API
// gives no customer, contract, date, status or fine, so none is shown or implied. The customer's own (demo) notices
// stay on ViolationsScreen, which links here. Rows are read-only (nothing to open).
function TypeRow({ type, first }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLabel={type.code ? `Code ${type.code}: ${type.label}` : type.label}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.divider,
      }}
    >
      <View
        style={{
          minWidth: 52,
          alignItems: "center",
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: RADIUS.sm,
          backgroundColor: colors.primarySoft,
        }}
      >
        <Text style={[TYPE.status, { color: colors.primary, fontVariant: ["tabular-nums"] }]}>
          {type.code ? `#${type.code}` : "—"}
        </Text>
      </View>
      <Text style={[TYPE.body, { flex: 1, color: colors.text }]}>{type.label}</Text>
    </View>
  );
}

export default function ViolationTypesScreen({ navigation }) {
  const { colors } = useTheme();
  const card = useCardStyle();
  const { loading, data: types, error, reload } = useAsync(fetchViolationTypes);

  const renderContent = () => {
    if (loading) {
      return (
        <SkeletonCard style={{ padding: 16 }}>
          {[0, 1, 2, 3, 4].map((key) => (
            <View key={key} style={{ flexDirection: "row", gap: 12, marginBottom: key < 4 ? 18 : 0 }}>
              <Skeleton width={52} height={22} radius={8} />
              <Skeleton width="70%" height={14} style={{ marginTop: 4 }} />
            </View>
          ))}
        </SkeletonCard>
      );
    }
    if (error) {
      return (
        <EmptyState icon="cloud-offline-outline" title="We couldn't load the violation types" message={errorMessage(error)}>
          <AnimatedButton label="Try again" onPress={reload} />
        </EmptyState>
      );
    }
    if (!types?.length) {
      return (
        <EmptyState
          icon="list-outline"
          title="No violation types available"
          message="MAZ hasn't published its list of violation types yet."
        >
          <AnimatedButton label="Check again" variant="secondary" onPress={reload} />
        </EmptyState>
      );
    }
    return (
      <FadeIn>
        <SectionHeading>{`${types.length} ${types.length === 1 ? "type" : "types"}`}</SectionHeading>
        <View style={[card, { overflow: "hidden" }]}>
          {types.map((type, index) => (
            <TypeRow key={type.name} type={type} first={index === 0} />
          ))}
        </View>
      </FadeIn>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <BackButton onPress={() => navigation.goBack()} />
          <ScreenTitle
            eyebrow="MAZ Business Center"
            title="Violation types"
            subtitle="The compliance categories MAZ uses when it records a violation."
          />
          <InfoNote boxed style={{ marginBottom: 24 }}>
            A reference list from MAZ — categories only, not notices issued to your company. It carries no dates,
            fines or status.
          </InfoNote>
          {renderContent()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
