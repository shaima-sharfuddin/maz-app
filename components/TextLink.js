import PressableScale from "./PressableScale";

// Secondary text action (e.g. "Forgot password?") with a 44pt minimum tap target.
export default function TextLink({ onPress, align = "center", children, style }) {
  const alignSelf = align === "right" ? "flex-end" : align === "left" ? "flex-start" : "center";

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="link"
      containerStyle={[{ alignSelf }, style]}
      style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 4 }}
    >
      {children}
    </PressableScale>
  );
}
