import { View } from "react-native";
import { WebView } from "react-native-webview";

// Tap's hosted checkout origin (the only host TapCheckout opens — apiMappers.toUiTapCharge).
const TAP_CHECKOUT_ORIGIN = "https://checkout.tap.company/";

// An invisible, inert WebView on the payment screens, so that by the time the user taps "Continue" the WebView
// engine is already started (slow the first time on Android) and DNS / TLS to Tap — plus whatever Tap's page caches —
// are warm. TapCheckout then opens noticeably faster. Renders nothing while `enabled` is false (demo payments).
export default function TapWarmup({ enabled = true }) {
  if (!enabled) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }}>
      <WebView
        source={{ uri: TAP_CHECKOUT_ORIGIN }}
        originWhitelist={["https://*"]}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        setSupportMultipleWindows={false}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        onError={() => {}}
        onHttpError={() => {}}
      />
    </View>
  );
}
