import { Component } from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import AnimatedButton from "./AnimatedButton";
import IconBadge from "./IconBadge";
import { useTheme } from "../theme/ThemeContext";
import { TYPE } from "../theme/theme";

// The friendly screen shown instead of a crash. No technical details — only what happened and a way forward.
function CrashFallback({ onRetry }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-1 px-6 justify-center" style={{ alignItems: "center" }}>
        <IconBadge icon="alert-outline" size={64} tone="danger" style={{ marginBottom: 20 }} />
        <Text style={[TYPE.sectionTitle, { color: colors.text, textAlign: "center", marginBottom: 8 }]}>
          Something went wrong
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 28 }}>
          This screen ran into a problem. Your information is safe — try again to continue.
        </Text>
        <View style={{ alignSelf: "stretch" }}>
          <AnimatedButton label="Try again" onPress={onRetry} />
        </View>
      </View>
    </SafeAreaView>
  );
}

// Root error boundary (App.js): a rendering error anywhere below shows CrashFallback instead of closing the app.
// "Try again" remounts everything below it — the providers re-read the saved session and settings, so the user
// lands back on their normal starting screen. Errors are logged in development builds only, never shown.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, resetKey: 0 };
    this.retry = () => this.setState((state) => ({ failed: false, resetKey: state.resetKey + 1 }));
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    SplashScreen.hide(); // the splash is held until start-up finishes — never let it cover this screen
    if (__DEV__) console.error("Render error caught by ErrorBoundary", error, info?.componentStack);
  }

  render() {
    if (this.state.failed) return <CrashFallback onRetry={this.retry} />;
    return <View key={this.state.resetKey} style={{ flex: 1 }}>{this.props.children}</View>;
  }
}
