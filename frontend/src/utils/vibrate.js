export const vibrateShort = () => {
  try {
    if (navigator.vibrate) navigator.vibrate(40);
  } catch {
    // silently ignore — vibration is a nice-to-have, never block on it
  }
};

export const vibrateReward = () => {
  try {
    if (navigator.vibrate) navigator.vibrate([30, 60, 90]);
  } catch {
    // silently ignore
  }
};
