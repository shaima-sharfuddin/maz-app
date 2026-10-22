import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing, ActivityIndicator, Alert, BackHandler } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AnimatedButton from "../components/AnimatedButton";
import IconBadge from "../components/IconBadge";
import PressableScale from "../components/PressableScale";
import { completeTapPayment } from "../services/api";
import { isTapCallbackUrl, parseTapCallback } from "../services/tapPayments";
import { formatBHD } from "../data/pricing";
import { useTheme } from "../theme/ThemeContext";
import { TYPE } from "../theme/theme";

// Runs after every page load in the WebView: on MAZ's callback page (Tap's redirect after paying), hand its JSON text
// to the app. Kept tiny and defensive — it runs inside third-party pages too.
const READ_CALLBACK = `(function () {
  try {
    if (window.location.href.indexOf("/tap/callback") !== -1 && window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(document.body ? document.body.innerText : "");
    }
  } catch (e) {}
})();
true;`;

// If the callback page loads but its text never arrives, stop waiting and report "still being confirmed".
const CONFIRM_TIMEOUT_MS = 15000;

// Tap's page has drawn its form well before every image / font / script finishes, so the "Opening secure checkout"
// cover lifts at this load progress instead of waiting for onLoadEnd — and after REVEAL_FALLBACK_MS at the latest.
const REVEAL_AT_PROGRESS = 0.7;
const REVEAL_FALLBACK_MS = 4000;

const fade = (value, toValue, duration = 240) =>
  Animated.timing(value, { toValue, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true });

// LIVE Tap checkout, inside the app (PaymentReview → contract bills, Payment → office request invoice).
// route.params: { checkout: { checkoutUrl, orderId, chargeId, amount }, purpose: { type: "invoice", requestId } |
// { type: "bills", contractIds } }. Tap's hosted page (card, BenefitPay, 3-D Secure) runs in a WebView; when Tap
// redirects to MAZ's callback, the page's JSON is read (parseTapCallback) and this screen is REPLACED by
// PaymentResult — Back from the result can never re-enter a finished checkout. Closing before paying asks first.
export default function TapCheckoutScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { checkout, purpose } = route.params ?? {};
  const [loadFailed, setLoadFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [webKey, setWebKey] = useState(0); // remounts the WebView for "Try again"
  const finished = useRef(false);
  const timeout = useRef(null);

  const [progress] = useState(() => new Animated.Value(0)); // 0–1 page load progress
  const [progressOpacity] = useState(() => new Animated.Value(1));
  const [openingOpacity] = useState(() => new Animated.Value(1)); // "Opening secure checkout…" cover
  const [confirmOpacity] = useState(() => new Animated.Value(0)); // "Confirming your payment…" cover

  useEffect(() => () => clearTimeout(timeout.current), []);

  const revealed = useRef(false);
  const reveal = useCallback(() => {
    if (revealed.current) return;
    revealed.current = true;
    fade(openingOpacity, 0, 200).start();
  }, [openingOpacity]);

  useEffect(() => {
    const timer = setTimeout(reveal, REVEAL_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [reveal, webKey]);

  const finish = useCallback(
    async (result) => {
      if (finished.current) return;
      finished.current = true;
      clearTimeout(timeout.current);
      const outcome = await completeTapPayment(purpose, result, {
        chargeId: checkout?.chargeId,
        amount: checkout?.amount,
      });
      navigation.replace("PaymentResult", {
        result: { ...outcome, amount: outcome.amount ?? checkout?.amount, orderId: outcome.orderId ?? checkout?.orderId },
        purpose,
      });
    },
    [navigation, purpose, checkout]
  );

  const startConfirming = useCallback(() => {
    if (confirming || finished.current) return;
    setConfirming(true);
    Haptics.selectionAsync().catch(() => {});
    fade(confirmOpacity, 1, 200).start();
    timeout.current = setTimeout(() => finish(null), CONFIRM_TIMEOUT_MS);
  }, [confirming, confirmOpacity, finish]);

  const confirmClose = useCallback(() => {
    if (confirming || finished.current) return true;
    Alert.alert("Cancel payment?", "You haven't been charged. You can pay later from your invoice.", [
      { text: "Keep paying", style: "cancel" },
      { text: "Cancel payment", style: "destructive", onPress: () => navigation.goBack() },
    ]);
    return true;
  }, [confirming, navigation]);

  // Android hardware back = the close button (the screen has no swipe-back).
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", confirmClose);
    return () => subscription.remove();
  }, [confirmClose]);

  if (!checkout?.checkoutUrl) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-6" style={{ backgroundColor: colors.canvas }}>
        <Text style={[TYPE.body, { color: colors.textMuted, marginBottom: 16, textAlign: "center" }]}>
          This payment can&apos;t be opened. Please start it again.
        </Text>
        <AnimatedButton label="Go back" onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const onLoadProgress = ({ nativeEvent }) => {
    Animated.timing(progress, {
      toValue: nativeEvent.progress,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
    if (nativeEvent.progress >= REVEAL_AT_PROGRESS) reveal();
    if (nativeEvent.progress >= 1) fade(progressOpacity, 0, 300).start();
    else progressOpacity.setValue(1);
  };

  const onLoadEnd = reveal;

  const onNavigationStateChange = ({ url }) => {
    if (isTapCallbackUrl(url)) startConfirming();
  };

  const onMessage = ({ nativeEvent }) => finish(parseTapCallback(nativeEvent.data));

  const onError = () => {
    if (confirming) return finish(null); // the callback itself failed to load — still being confirmed
    setLoadFailed(true);
  };

  const retry = () => {
    setLoadFailed(false);
    revealed.current = false;
    openingOpacity.setValue(1);
    progress.setValue(0);
    setWebKey((key) => key + 1);
  };

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1" style={{ backgroundColor: colors.canvas }}>
      {/* Header: close · secure checkout · amount */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
        }}
      >
        <PressableScale
          onPress={confirmClose}
          disabled={confirming}
          accessibilityRole="button"
          accessibilityLabel="Cancel payment"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            opacity: confirming ? 0.4 : 1,
          }}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </PressableScale>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[TYPE.cardTitle, { color: colors.text }]}>Secure checkout</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 1 }}>
            <Ionicons name="lock-closed" size={11} color={colors.success} style={{ marginRight: 4 }} />
            <Text style={[TYPE.caption, { color: colors.textMuted }]}>Encrypted · Payments by Tap</Text>
          </View>
        </View>
        <View
          style={{
            minWidth: 44,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: colors.surfaceMuted,
          }}
        >
          <Text style={[TYPE.status, { color: colors.text, fontVariant: ["tabular-nums"] }]}>
            {formatBHD(checkout.amount)}
          </Text>
        </View>
      </View>

      {/* Load progress: a hairline that fills, then fades away. */}
      <Animated.View style={{ height: 2, opacity: progressOpacity, backgroundColor: colors.divider }}>
        <Animated.View style={{ height: 2, width: barWidth, backgroundColor: colors.primary }} />
      </Animated.View>

      <View style={{ flex: 1 }}>
        {loadFailed ? (
          <View className="flex-1 items-center justify-center px-8">
            <IconBadge icon="cloud-offline-outline" size={64} style={{ marginBottom: 20 }} />
            <Text style={[TYPE.sectionTitle, { color: colors.text, textAlign: "center", marginBottom: 8 }]}>
              Checkout didn&apos;t load
            </Text>
            <Text style={[TYPE.body, { color: colors.textMuted, textAlign: "center", marginBottom: 24 }]}>
              Check your connection and try again. You haven&apos;t been charged.
            </Text>
            <AnimatedButton label="Try again" onPress={retry} />
          </View>
        ) : (
          <WebView
            key={webKey}
            source={{ uri: checkout.checkoutUrl }}
            style={{ flex: 1, backgroundColor: "#ffffff" /* Tap's page is light */ }}
            originWhitelist={["https://*"]}
            injectedJavaScript={READ_CALLBACK}
            onMessage={onMessage}
            onNavigationStateChange={onNavigationStateChange}
            onLoadProgress={onLoadProgress}
            onLoadEnd={onLoadEnd}
            onError={onError}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            setSupportMultipleWindows={false}
            allowsBackForwardNavigationGestures={false}
            cacheEnabled
            androidLayerType="hardware"
          />
        )}

        {/* Opening cover — fades away once Tap's page has drawn. */}
        {loadFailed ? null : (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: openingOpacity,
              backgroundColor: colors.background,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconBadge icon="shield-checkmark-outline" size={64} style={{ marginBottom: 18 }} />
            <Text style={[TYPE.cardTitle, { color: colors.text, marginBottom: 6 }]}>Opening secure checkout</Text>
            <Text style={[TYPE.caption, { color: colors.textMuted, marginBottom: 20 }]}>
              Order {checkout.orderId}
            </Text>
            <ActivityIndicator color={colors.primary} />
          </Animated.View>
        )}

        {/* Confirming cover — Tap has finished; MAZ's callback is being read. */}
        {confirming ? (
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: confirmOpacity,
              backgroundColor: colors.background,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 32,
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 22 }} />
            <Text style={[TYPE.sectionTitle, { color: colors.text, marginBottom: 6 }]}>Confirming your payment</Text>
            <Text style={[TYPE.body, { color: colors.textMuted, textAlign: "center" }]}>
              This only takes a moment. Please don&apos;t close the app.
            </Text>
          </Animated.View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
