export const emitCoinEarned = (coinsEarned) => {
  if (!coinsEarned || !coinsEarned.amount) return;
  window.dispatchEvent(new CustomEvent("coin-earned", { detail: coinsEarned }));
};

export const emitBoostActivated = (minutes) => {
  window.dispatchEvent(new CustomEvent("boost-activated", { detail: { minutes } }));
};
