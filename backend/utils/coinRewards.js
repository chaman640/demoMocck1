import User from "../models/User.js";
import CoinTransaction from "../models/CoinTransaction.js";
import { getISTDateString, computeStreakRun } from "./streakEngine.js";

export const COIN_CONFIG = {
  BASE_DAILY_COINS: 10,
  STREAK_BONUS_COINS: 15,
  STREAK_BONUS_EVERY: 7,
  MIN_COMPLETION_RATIO: 0.5,
  BOOST_MULTIPLIER: 2,
  BOOST_DURATION_MINUTES: 45,
  MAX_BOOST_ACTIVATIONS_PER_DAY: 3,
  FREE_PHYSICAL_BOOK_LIMIT: 1,
};

export const creditDailyCoinsIfEligible = async (user, { attempted, total }) => {
  try {
    if (!user || !user._id) return null;
    if (!total || total <= 0) return null;
    if (attempted / total < COIN_CONFIG.MIN_COMPLETION_RATIO) return null;

    const todayStr = getISTDateString();

    const freshUser = await User.findById(user._id).select(
      "activityDates coins longestStreak boostActiveUntil"
    );
    if (!freshUser) return null;

    if (freshUser.activityDates.includes(todayStr)) return null;

    const updatedDates = [...freshUser.activityDates, todayStr].sort();
    const newStreak = computeStreakRun(updatedDates);

    let coinsToAward = COIN_CONFIG.BASE_DAILY_COINS;
    let type = "test_completion";
    const isStreakBonus = newStreak > 0 && newStreak % COIN_CONFIG.STREAK_BONUS_EVERY === 0;
    if (isStreakBonus) {
      coinsToAward += COIN_CONFIG.STREAK_BONUS_COINS;
      type = "streak_bonus";
    }

    const isBoosted = Boolean(freshUser.boostActiveUntil && new Date(freshUser.boostActiveUntil) > new Date());
    if (isBoosted) {
      coinsToAward *= COIN_CONFIG.BOOST_MULTIPLIER;
    }

    freshUser.activityDates = updatedDates;
    freshUser.coins = (freshUser.coins || 0) + coinsToAward;
    if (newStreak > (freshUser.longestStreak || 0)) {
      freshUser.longestStreak = newStreak;
    }
    await freshUser.save();

    await CoinTransaction.create({
      user: freshUser._id,
      type,
      amount: coinsToAward,
      balanceAfter: freshUser.coins,
      note: isBoosted ? "2x Boost active" : isStreakBonus ? `${newStreak}-din streak bonus` : undefined,
    });

    return {
      amount: coinsToAward,
      isBoosted,
      isStreakBonus,
      newStreak,
    };
  } catch (error) {
    console.error("creditDailyCoinsIfEligible error:", error.message);
    return null;
  }
};
