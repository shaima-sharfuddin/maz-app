// Short chimes for the payment result (PaymentResult): a rising bell for success, two soft falling notes for a
// failure, one neutral note while pending. Generated for the app (assets/sounds — no third-party audio).
// Respects the phone's silent / vibrate switch (playsInSilentMode false) and mixes with other audio, so music keeps
// playing. Best effort: if the audio module is missing (an old dev build) or playback fails, nothing happens.
const SOUNDS = {
  succeeded: require("../assets/sounds/payment-success.wav"),
  failed: require("../assets/sounds/payment-failed.wav"),
  pending: require("../assets/sounds/payment-pending.wav"),
};

const RELEASE_AFTER_MS = 2500; // every chime is under 1.5 s

let audioModeSet = false;

export async function playResultSound(outcome) {
  const source = SOUNDS[outcome];
  if (!source) return;
  try {
    // Loaded lazily: a dev build made before expo-audio was added has no native module, and must not crash.
    const { createAudioPlayer, setAudioModeAsync } = require("expo-audio");
    if (!audioModeSet) {
      audioModeSet = true;
      await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" }).catch(() => {});
    }
    const player = createAudioPlayer(source);
    player.volume = 0.8;
    player.play();
    setTimeout(() => {
      try {
        player.remove();
      } catch {
        // already released
      }
    }, RELEASE_AFTER_MS);
  } catch {
    // no sound — the haptic still marks the moment
  }
}
