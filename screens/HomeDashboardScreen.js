import { View, Text, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AnimatedButton from "../components/AnimatedButton";
import TrustStats from "../components/TrustStats";
import { TRUST_STATS, BAHRAIN_ADVANTAGES, SERVICES } from "../data/brand";

const cardStyle = {
  backgroundColor: "rgba(255,255,255,0.04)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.08)",
  borderRadius: 16,
};

function SectionHeading({ children }) {
  return <Text className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">{children}</Text>;
}

// New-user state only — the active-tenant state (contract status, quick actions) comes with the backend.
export default function HomeDashboardScreen({ route }) {
  const ownerName = route.params?.ownerName;
  const profileSaved = route.params?.profileSaved;

  return (
    <SafeAreaView className="flex-1 bg-navyDark">
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-8 pb-10">
          <Image
            source={require("../assets/images/maz-logo-wordmark.png")}
            style={{ width: 120, height: 30, marginBottom: 28 }}
            resizeMode="contain"
          />

          {profileSaved ? <Text className="text-emerald-400 text-sm mb-4">{"✓"} Profile saved</Text> : null}

          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">
            MAZ Business Center
          </Text>
          <Text className="text-white text-2xl font-bold mb-2">
            {ownerName ? `Welcome, ${ownerName}` : "Welcome"}
          </Text>
          <Text className="text-slate-300 text-base leading-6 mb-8">
            Your prestigious business address in Bahrain begins here.
          </Text>

          <View style={[cardStyle, { borderLeftWidth: 3, borderLeftColor: "#a31c37", padding: 20, marginBottom: 32 }]}>
            <Text className="text-white text-lg font-semibold mb-2">{"You haven't leased an office yet"}</Text>
            <Text className="text-slate-400 text-sm leading-5 mb-5">
              Explore fully serviced office suites with seamless setup and concierge-level support.
            </Text>
            {/* TODO: navigate to BrowsePlans once built */}
            <AnimatedButton label="Browse Plans" />
          </View>

          <SectionHeading>Why MAZ</SectionHeading>
          <TrustStats stats={TRUST_STATS} />
          <View style={[cardStyle, { flexDirection: "row", marginTop: 10, marginBottom: 32 }]}>
            {BAHRAIN_ADVANTAGES.map((item, index) => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 14,
                  borderLeftWidth: index > 0 ? 1 : 0,
                  borderLeftColor: "rgba(255,255,255,0.08)",
                }}
              >
                <Text className="text-crimson text-lg font-bold">{item.value}</Text>
                <Text className="text-slate-400 text-xs mt-1">{item.label}</Text>
              </View>
            ))}
          </View>

          <SectionHeading>What we offer</SectionHeading>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
            {SERVICES.map((service) => (
              <View key={service.title} style={[cardStyle, { flexBasis: "47%", flexGrow: 1, padding: 16 }]}>
                <Text className="text-white text-base font-semibold mb-1">{service.title}</Text>
                <Text className="text-slate-400 text-xs leading-5">{service.description}</Text>
              </View>
            ))}
          </View>

          <SectionHeading>What our clients say</SectionHeading>
          {/* PLACEHOLDER — real testimonials need MAZ's permission before they can be used here. */}
          <View
            style={{
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: "rgba(255,255,255,0.15)",
              borderRadius: 16,
              paddingVertical: 28,
              paddingHorizontal: 20,
              alignItems: "center",
            }}
          >
            <Text className="text-slate-500 text-sm text-center">Client stories will appear here.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
