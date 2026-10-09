import { View, Image } from "react-native";
import { useTheme } from "../theme/ThemeContext";

// The MAZ wordmark on a light chip, so its navy squares stay visible over photos and dark surfaces.
// `bare` drops the chip (light backgrounds only).
export default function BrandMark({ width = 96, bare = false, style }) {
  const { elevation } = useTheme();
  const height = Math.round(width / 3.98); // the wordmark's aspect ratio (342 × 86)
  const logo = (
    <Image
      source={require("../assets/images/maz-logo-wordmark.png")}
      style={{ width, height }}
      resizeMode="contain"
      accessibilityLabel="MAZ Business Center"
    />
  );
  if (bare) return <View style={style}>{logo}</View>;
  return (
    <View
      style={[
        {
          alignSelf: "flex-start",
          backgroundColor: "#ffffff", // the logo needs a light ground in both themes
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 8,
          ...elevation.card,
        },
        style,
      ]}
    >
      {logo}
    </View>
  );
}
