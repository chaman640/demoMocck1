export const emitCoinEarned = (coinsEarned) => {
  if (!coinsEarned || !coinsEarned.amount) return;
  window.dispatchEvent(new CustomEvent("coin-earned", { detail: coinsEarned }));
};
