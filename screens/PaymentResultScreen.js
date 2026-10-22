import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Animated, Easing, AccessibilityInfo, BackHandler } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { setStatusBarStyle } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AnimatedButton from "../components/AnimatedButton";
import BrandSquares from "../components/BrandSquares";
import CountUp from "../components/CountUp";
import DocumentSheet from "../components/DocumentSheet";
import FadeIn from "../components/FadeIn";
import { formatBHD } from "../data/pricing";
import { formatDateTime } from "../utils/formatDate";
import { goHome } from "../utils/navigation";
import { playResultSound } from "../utils/resultSound";
import { useTheme } from "../theme/ThemeContext";
import { useCardStyle } from "../theme/surfaces";
import { PALETTES, RADIUS, TYPE } from "../theme/theme";

const BADGE = 84;

// The hero is navy in both themes, so its status tones are the bright (dark-palette) ones — the light palette's deep
// green / red would disappear on navy.
const ON_NAVY = PALETTES.dark;

// Per outcome: the badge's tone + glyph, the haptic that lands with it (the chime plays with it), and the copy.
const OUTCOMES = {
  succeeded: {
    tone: "success",
    icon: "checkmark",
    haptic: Haptics.NotificationFeedbackType.Success,
    status: "Payment received",
    title: "Payment successful",
    message: "Thank you. Your payment to MAZ Business Center is complete.",
  },
  failed: {
    tone: "danger",
    icon: "close",
    haptic: Haptics.NotificationFeedbackType.Error,
    status: "Not completed",
    title: "Payment didn't go through",
    message: "No money was taken from your account. You can try again whenever you're ready.",
  },
  pending: {
    tone: "warning",
    icon: "time-outline",
    haptic: Haptics.NotificationFeedbackType.Warning,
    status: "Processing",
    title: "Confirming your payment",
    message: "We haven't received the final confirmation yet. Please don't pay again — MAZ will confirm it shortly.",
  },
};

// What the customer can do next, under the receipt (failed / pending only — a success needs no advice).
const NEXT_STEPS = {
  failed: {
    title: "What you can try",
    items: [
      { icon: "card-outline", text: "Check the card number, expiry date and CVV." },
      { icon: "shield-checkmark-outline", text: "Approve the 3-D Secure check from your bank when it appears." },
      { icon: "swap-horizontal-outline", text: "Use another card, or BenefitPay." },
    ],
  },
  pending: {
    title: "What happens next",
    items: [
      { icon: "hourglass-outline", text: "Tap and MAZ are confirming the payment — usually within minutes." },
      { icon: "ban-outline", text: "Please don't pay again, so you aren't charged twice." },
      { icon: "mail-outline", text: "Your invoice shows Paid once MAZ records it." },
    ],
  },
};

const CONFETTI_COLORS = [ON_NAVY.success, "#ffffff", "#f2eee7", ON_NAVY.highlight, "#9db4d9"];

// Brand squares bursting from the badge on success: each flies out on its own angle, spins, drifts down and fades.
// Pieces are laid out once (useState initialiser), so re-renders never reshuffle them.
function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 22 }, (_, index) => {
      const angle = (index / 22) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const distance = 90 + Math.random() * 90;
      return {
        value: new Animated.Value(0),
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance * 0.8 - 20,
        size: 5 + Math.round(Math.random() * 5),
        spin: `${(Math.random() > 0.5 ? 1 : -1) * (180 + Math.round(Math.random() * 360))}deg`,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        delay: 240 + Math.round(Math.random() * 120),
      };
    })
  );

  useEffect(() => {
    let cancelled = false;
    let animation;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduceMotion) => {
        if (cancelled || reduceMotion) return;
        animation = Animated.parallel(
          pieces.map((piece) =>
            Animated.timing(piece.value, {
              toValue: 1,
              duration: 1300,
              delay: piece.delay,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            })
          )
        );
        animation.start();
      });
    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [pieces]);

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", top: BADGE, left: "50%" }}
    >
      {pieces.map((piece, index) => (
        <Animated.View
          key={index}
          style={{
            position: "absolute",
            width: piece.size,
            height: piece.size,
            borderRadius: piece.size / 5,
            backgroundColor: piece.color,
            opacity: piece.value.interpolate({ inputRange: [0, 0.05, 0.7, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateX: piece.value.interpolate({ inputRange: [0, 1], outputRange: [0, piece.dx] }) },
              // Out fast, then a gentle fall.
              {
                translateY: piece.value.interpolate({
                  inputRange: [0, 0.6, 1],
                  outputRange: [0, piece.dy, piece.dy + 46],
                }),
              },
              { rotate: piece.value.interpolate({ inputRange: [0, 1], outputRange: ["0deg", piece.spin] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

// The animated status badge on the navy hero: the disc settles in, the glyph lands a beat later (with the haptic and
// the chime), and two soft halo rings ripple outward. Reduce motion → shown at rest; haptic and chime still play.
function ResultBadge({ outcome }) {
  const { tone, icon, haptic } = OUTCOMES[outcome];
  const [disc] = useState(() => new Animated.Value(0));
  const [glyph] = useState(() => new Animated.Value(0));
  const [halos] = useState(() => [new Animated.Value(0), new Animated.Value(0)]);

  useEffect(() => {
    let animation;
    let cancelled = false;
    let timer;
    const land = () => {
      Haptics.notificationAsync(haptic).catch(() => {});
      playResultSound(outcome);
    };
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduceMotion) => {
        if (cancelled) return;
        if (reduceMotion) {
          disc.setValue(1);
          glyph.setValue(1);
          land();
          return;
        }
        const ripple = (value, delay) =>
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(value, { toValue: 1, duration: 1500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          ]);
        animation = Animated.parallel([
          Animated.timing(disc, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(220),
            Animated.timing(glyph, { toValue: 1, duration: 340, easing: Easing.out(Easing.back(2.2)), useNativeDriver: true }),
          ]),
          ripple(halos[0], 300),
          ripple(halos[1], 680),
        ]);
        animation.start();
        timer = setTimeout(() => !cancelled && land(), 260); // as the glyph lands
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      animation?.stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- plays once, on arrival

  const color = ON_NAVY[tone];
  const halo = (value) => ({
    position: "absolute",
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    borderWidth: 2,
    borderColor: color,
    opacity: value.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.45, 0] }),
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }],
  });

  return (
    <View style={{ width: BADGE * 2, height: BADGE * 2, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={halo(halos[0])} />
      <Animated.View style={halo(halos[1])} />
      <Animated.View
        style={{
          width: BADGE + 30,
          height: BADGE + 30,
          borderRadius: (BADGE + 30) / 2,
          backgroundColor: ON_NAVY[`${tone}Soft`],
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
          alignItems: "center",
          justifyContent: "center",
          opacity: disc,
          transform: [{ scale: disc.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
        }}
      >
        <View
          style={{
            width: BADGE,
            height: BADGE,
            borderRadius: BADGE / 2,
            backgroundColor: color,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Animated.View
            style={{
              opacity: glyph,
              transform: [
                { scale: glyph.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                { rotate: glyph.interpolate({ inputRange: [0, 1], outputRange: ["-25deg", "0deg"] }) },
              ],
            }}
          >
            <Ionicons name={icon} size={BADGE / 2} color={ON_NAVY.onPrimary} />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

// The end of a LIVE Tap payment (replaces TapCheckout). route.params: { result: apiMappers.toUiTapResult shape
// (+ amount / orderId fallbacks), purpose: { type: "invoice", requestId } | { type: "bills", contractIds } }.
// Layout (2026-10-22 polish): a navy hero (badge, confetti on success, status chip, title, amount counting up) with a
// chime + haptic as the badge lands (utils/resultSound.js); the receipt sheet overlaps the hero; failed / pending add
// "What you can try" / "What happens next"; actions sit in a fixed footer. Failed: Try again (back to the payment
// screen). There is no way back into the finished checkout — hardware back takes the screen's primary exit.
export default function PaymentResultScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const card = useCardStyle();
  const insets = useSafeAreaInsets();
  const result = route.params?.result ?? { outcome: "pending" };
  const purpose = route.params?.purpose ?? null;
  const outcome = OUTCOMES[result.outcome] ? result.outcome : "pending";
  const copy = OUTCOMES[outcome];
  const tone = ON_NAVY[copy.tone];
  const [leaving, setLeaving] = useState(false);

  const isInvoice = purpose?.type === "invoice";
  const singleContract = purpose?.type === "bills" && purpose.contractIds?.length === 1 ? purpose.contractIds[0] : null;

  // Light status-bar icons over the navy hero, in either theme; the theme's style is restored on leaving.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle(isDark ? "light" : "dark");
    }, [isDark])
  );

  const exit = useCallback(
    (action) => {
      if (leaving) return;
      setLeaving(true);
      action();
    },
    [leaving]
  );
  const toDashboard = useCallback(() => exit(() => goHome(navigation)), [exit, navigation]);
  // refreshKey makes the invoice reload, so it shows Paid straight away.
  const toInvoice = useCallback(
    () => exit(() => navigation.popTo("RequestInvoice", { requestId: purpose.requestId, refreshKey: Date.now() })),
    [exit, navigation, purpose]
  );
  const toContract = useCallback(
    () => exit(() => navigation.popTo("ContractDetail", { contractId: singleContract })),
    [exit, navigation, singleContract]
  );
  const tryAgain = useCallback(() => exit(() => navigation.goBack()), [exit, navigation]);

  const primary = useMemo(
    () =>
      outcome === "failed"
        ? { label: "Try again", onPress: tryAgain }
        : isInvoice
          ? { label: "View invoice", onPress: toInvoice }
          : singleContract
            ? { label: "Back to contract", onPress: toContract }
            : { label: "Back to dashboard", onPress: toDashboard },
    [outcome, isInvoice, singleContract, tryAgain, toInvoice, toContract, toDashboard]
  );

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      primary.onPress();
      return true;
    });
    return () => subscription.remove();
  }, [primary]);

  const hasAmount = typeof result.amount === "number";
  const rows = [
    result.card ? { label: "Paid with", value: `${result.card.brand} •••• ${result.card.lastFour}` } : null,
    result.paidAt && outcome === "succeeded" ? { label: "Date & time", value: formatDateTime(result.paidAt) } : null,
    outcome === "failed" && result.message ? { label: "Reason", value: result.message } : null,
    result.reference ? { label: "Reference", value: result.reference } : null,
    result.chargeId ? { label: "Transaction ID", value: result.chargeId } : null,
    result.orderId ? { label: "Order", value: result.orderId } : null,
  ].filter(Boolean);

  const footnote =
    outcome === "succeeded"
      ? isInvoice
        ? "MAZ will now prepare your contract and confirm your unit."
        : "Your bills update once MAZ records this payment."
      : null;
  const nextSteps = NEXT_STEPS[outcome];

  const amountStyle = [
    TYPE.amountDisplay,
    { color: outcome === "failed" ? colors.onHeroSubtle : colors.onHero, textAlign: "center", marginBottom: 10 },
    outcome === "failed" ? { textDecorationLine: "line-through" } : null,
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.canvas }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }} bounces={false}>
        {/* Navy hero */}
        <View
          style={{
            backgroundColor: colors.hero,
            borderBottomLeftRadius: RADIUS.sheet,
            borderBottomRightRadius: RADIUS.sheet,
            paddingTop: insets.top + 20,
            paddingBottom: 72,
            paddingHorizontal: 24,
            alignItems: "center",
            overflow: "hidden",
          }}
        >
          <BrandSquares size={12} gap={4} color={colors.heroGlass} style={{ position: "absolute", right: 20, bottom: 24 }} />
          <View style={{ alignItems: "center" }}>
            {outcome === "succeeded" ? <Confetti /> : null}
            <ResultBadge outcome={outcome} />
          </View>

          <FadeIn delay={280} offset={14} style={{ alignItems: "center", width: "100%" }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: RADIUS.pill,
                backgroundColor: colors.heroGlass,
                marginBottom: 14,
              }}
            >
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tone, marginRight: 8 }} />
              <Text style={[TYPE.overline, { color: colors.onHero }]}>{copy.status}</Text>
            </View>
            <Text
              accessibilityRole="header"
              style={[TYPE.screenTitle, { color: colors.onHero, textAlign: "center", marginBottom: 10 }]}
            >
              {copy.title}
            </Text>
            {hasAmount ? (
              outcome === "succeeded" ? (
                <CountUp
                  value={String(result.amount)}
                  format={formatBHD}
                  delay={380}
                  duration={900}
                  style={amountStyle}
                />
              ) : (
                <Text style={amountStyle} adjustsFontSizeToFit numberOfLines={1}>
                  {formatBHD(result.amount)}
                </Text>
              )
            ) : null}
            <Text style={[TYPE.body, { color: colors.onHeroMuted, textAlign: "center", maxWidth: 320 }]}>
              {copy.message}
            </Text>
          </FadeIn>
        </View>

        {/* Receipt + next steps, overlapping the hero */}
        <View className="px-6" style={{ marginTop: -44 }}>
          {rows.length > 0 ? (
            <FadeIn delay={420} offset={22}>
              <DocumentSheet
                sections={[{ key: "details", title: outcome === "succeeded" ? "Receipt" : "Details", rows }]}
              />
            </FadeIn>
          ) : null}

          {nextSteps ? (
            <FadeIn delay={520} offset={18}>
              <View style={[card, { padding: 20, marginBottom: 16 }]}>
                <Text style={[TYPE.cardTitle, { color: colors.text, marginBottom: 12 }]}>{nextSteps.title}</Text>
                {nextSteps.items.map((item, index) => (
                  <View
                    key={item.text}
                    style={{ flexDirection: "row", alignItems: "center", marginTop: index > 0 ? 12 : 0 }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.primarySoft,
                        marginRight: 12,
                      }}
                    >
                      <Ionicons name={item.icon} size={18} color={colors.primary} />
                    </View>
                    <Text style={[TYPE.body, { color: colors.text, flex: 1 }]}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </FadeIn>
          ) : null}

          <FadeIn delay={600}>
            {outcome === "succeeded" && result.receiptEmailed ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  alignSelf: "center",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: RADIUS.pill,
                  backgroundColor: colors.successSoft,
                  marginBottom: 12,
                }}
              >
                <Ionicons name="mail-outline" size={14} color={colors.success} style={{ marginRight: 6 }} />
                <Text style={[TYPE.status, { color: colors.success }]}>A receipt has been emailed to you</Text>
              </View>
            ) : null}
            {footnote ? (
              <Text style={[TYPE.caption, { color: colors.textSubtle, textAlign: "center" }]}>{footnote}</Text>
            ) : null}
          </FadeIn>
        </View>
      </ScrollView>

      {/* Actions — always in reach */}
      <View
        style={{
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
          paddingHorizontal: 24,
          paddingTop: 14,
          paddingBottom: insets.bottom + 12,
        }}
      >
        <AnimatedButton label={primary.label} onPress={primary.onPress} disabled={leaving} />
        {primary.onPress !== toDashboard ? (
          <View style={{ marginTop: 4 }}>
            <AnimatedButton label="Back to dashboard" variant="ghost" onPress={toDashboard} disabled={leaving} />
          </View>
        ) : null}
        {outcome === "pending" && isInvoice ? (
          <AnimatedButton label="View invoice" variant="ghost" onPress={toInvoice} disabled={leaving} />
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 6 }}>
          <Ionicons name="lock-closed" size={11} color={colors.textSubtle} style={{ marginRight: 4 }} />
          <Text style={[TYPE.caption, { color: colors.textSubtle }]}>Secured by Tap Payments</Text>
        </View>
      </View>
    </View>
  );
}
