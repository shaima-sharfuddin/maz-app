import { useState } from "react";
import { View, Text } from "react-native";
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Extrapolation,
} from "react-native-reanimated";
import { useTheme } from "../theme/ThemeContext";
import { RADIUS, TYPE } from "../theme/theme";

// One pagination dot: grows into a short pill while its photo is in view (driven by the scroll position, on the UI
// thread — the dots track the finger, not the page change).
function Dot({ index, scrollX, width, color }) {
  const style = useAnimatedStyle(() => {
    const position = width ? scrollX.value / width : 0;
    const focus = interpolate(Math.abs(position - index), [0, 1], [1, 0], Extrapolation.CLAMP);
    return { width: 6 + focus * 10, opacity: 0.55 + focus * 0.45 };
  });
  return (
    <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: color, marginHorizontal: 3 }, style]} />
  );
}

// One photo that fades in once decoded (no pop-in on slower phones).
function FadeImage({ source, width, height }) {
  const opacity = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.Image
      source={source}
      onLoad={() => opacity.set(withTiming(1, { duration: 280 }))}
      style={[{ width, height }, style]}
      resizeMode="cover"
    />
  );
}

// Airbnb-style swipeable photos: paged, rounded, with tracking pill dots over the bottom edge and an optional "1 / 3"
// chip. Bundled photos (theme/imagery.js) only. `height` fixes the height (headers); otherwise `aspectRatio` (cards).
export default function PhotoCarousel({
  photos = [],
  aspectRatio = 4 / 3,
  height,
  radius = RADIUS.photo,
  showCounter = false,
  accessibilityLabel,
  style,
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });
  const photoHeight = height ?? (width ? width / aspectRatio : 0);

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[
        { borderRadius: radius, overflow: "hidden", backgroundColor: colors.skeleton },
        height ? { height } : { aspectRatio },
        style,
      ]}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
    >
      {width ? (
        <Animated.FlatList
          data={photos}
          keyExtractor={(_, index) => String(index)}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => <FadeImage source={item} width={width} height={photoHeight} />}
        />
      ) : null}

      {photos.length > 1 ? (
        <View
          pointerEvents="none"
          style={{ position: "absolute", bottom: 12, left: 0, right: 0, flexDirection: "row", justifyContent: "center" }}
        >
          {photos.map((_, index) => (
            <Dot key={index} index={index} scrollX={scrollX} width={width} color={colors.onHero} />
          ))}
        </View>
      ) : null}

      {showCounter && photos.length > 1 ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            right: 14,
            bottom: 12,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: RADIUS.pill,
            backgroundColor: colors.backdrop,
          }}
        >
          <Text style={[TYPE.status, { color: colors.onHero, fontVariant: ["tabular-nums"] }]}>
            {page + 1} / {photos.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
