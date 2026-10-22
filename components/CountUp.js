import { useEffect, useState } from "react";
import { Text } from "react-native";

// A stat whose number counts up from zero ("4.9", "18+", "25+", "100%" — decimals and suffix kept). Values that
// don't start with a number are shown as they are. reduceMotion shows the final value at once. `format(number)`
// replaces the default text (fixed decimals + suffix) — e.g. formatBHD for an amount.
export default function CountUp({ value, delay = 0, duration = 1200, reduceMotion, format, style }) {
  const match = /^([\d.]+)(.*)$/.exec(value);
  const target = match ? Number(match[1]) : null;
  const decimals = match && match[1].includes(".") ? match[1].split(".")[1].length : 0;
  const suffix = match ? match[2] : "";
  const [shown, setShown] = useState(reduceMotion || target == null ? target : 0);

  useEffect(() => {
    if (reduceMotion || target == null) return undefined;
    let frame;
    let start;
    const timer = setTimeout(() => {
      const tick = (now) => {
        start ??= now;
        const t = Math.min(1, (now - start) / duration);
        setShown(target * (1 - (1 - t) ** 3)); // ease-out cubic
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [target, delay, duration, reduceMotion]);

  if (target == null) return <Text style={style}>{value}</Text>;
  const current = reduceMotion ? target : shown;
  return (
    <Text style={style} accessibilityLabel={format ? format(target) : value}>
      {format ? format(current) : `${current.toFixed(decimals)}${suffix}`}
    </Text>
  );
}
