import { View, Text } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import PhotoCarousel from "./PhotoCarousel";
import PressableScale from "./PressableScale";
import { useTheme } from "../theme/ThemeContext";
import { RADIUS, TYPE } from "../theme/theme";

const BAR = 52; // the collapsed top bar's height (below the status bar)

// Airbnb listing header (Visual system v2): a swipeable photo header that drifts at half speed as the page scrolls
// (and stretches when pulled down on iOS), a floating round back button, and a solid top bar with the title that fades
// in once the photos have scrolled away. The page content slides over the photo on a rounded sheet.
// Children = the page body. Put a StickyFooter AFTER this component (outside it).
export default function ParallaxHeader({ photos, title, onBack, photoHeight = 340, children }) {
  const { colors, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const fadeStart = photoHeight - insets.top - BAR - 60;
  const photoStyle = useAnimatedStyle(() => {
    const y = scrollY.value;
    return {
      transform: [
        { translateY: y < 0 ? y / 2 : y * 0.5 },
        { scale: y < 0 ? 1 + -y / photoHeight : 1 },
      ],
    };
  });
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [fadeStart, fadeStart + 50], [0, 1], Extrapolation.CLAMP),
  }));
  const buttonBackdrop = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [fadeStart, fadeStart + 50], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
        <Animated.View style={[{ height: photoHeight }, photoStyle]}>
          <PhotoCarousel photos={photos} height={photoHeight} radius={0} showCounter />
        </Animated.View>
        {/* The page body rides over the photo's bottom edge on a rounded sheet. */}
        <View
          style={{
            marginTop: -RADIUS.hero,
            borderTopLeftRadius: RADIUS.hero,
            borderTopRightRadius: RADIUS.hero,
            backgroundColor: colors.background,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 24,
            minHeight: 400,
          }}
        >
          {children}
        </View>
      </Animated.ScrollView>

      {/* Solid top bar — fades in as the photo leaves. */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top,
            height: insets.top + BAR,
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.divider,
            justifyContent: "center",
          },
          barStyle,
        ]}
      >
        <Text style={[TYPE.cardTitle, { color: colors.text, textAlign: "center", marginHorizontal: 72 }]} numberOfLines={1}>
          {title}
        </Text>
      </Animated.View>

      {/* Floating back button: a white disc over the photo, plain once the bar is solid. */}
      {onBack ? (
        <View style={{ position: "absolute", top: insets.top + 4, left: 16 }}>
          <PressableScale
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Animated.View
              style={[
                { position: "absolute", width: 36, height: 36, borderRadius: 18, backgroundColor: colors.sheet },
                elevation.card,
                buttonBackdrop,
              ]}
            />
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </PressableScale>
        </View>
      ) : null}
    </View>
  );
}
