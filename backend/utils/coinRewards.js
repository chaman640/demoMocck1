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

    const freshUser = await User.findById(user._id).select("activityDates boostActiveUntil");
    if (!freshUser) return null;

    const existingDates = freshUser.activityDates || [];
    if (existingDates.includes(todayStr)) return null;

    const newStreak = computeStreakRun([...existingDates, todayStr].sort());

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

    const updated = await User.findOneAndUpdate(
      { _id: user._id, activityDates: { $ne: todayStr } },
      {
        $addToSet: { activityDates: todayStr },
        $inc: { coins: coinsToAward },
        $max: { longestStreak: newStreak },
      },
      { new: true, projection: { coins: 1 } }
    );
    if (!updated) return null;

    try {
      await CoinTransaction.create({
        user: user._id,
        type,
        amount: coinsToAward,
        balanceAfter: updated.coins,
        note: isBoosted ? "2x Boost active" : isStreakBonus ? `${newStreak}-din streak bonus` : undefined,
      });
    } catch (ledgerError) {
      console.error("CoinTransaction ledger write failed:", ledgerError.message);
    }

    return { amount: coinsToAward, isBoosted, isStreakBonus, newStreak };
  } catch (error) {
    console.error("creditDailyCoinsIfEligible error:", error.message);
    return null;
  }
};
