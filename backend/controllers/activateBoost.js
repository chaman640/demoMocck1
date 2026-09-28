import User from "../models/User.js";
import { getISTDateString } from "../utils/streakEngine.js";
import { COIN_CONFIG } from "../utils/coinRewards.js";

export const activateBoost = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "boostActiveUntil boostActivationsToday boostActivationsDate"
    );
    if (!user) {
      return res.status(404).json({ success: false, message: "User nahi mila!" });
    }

    const todayStr = getISTDateString();
    if (user.boostActivationsDate !== todayStr) {
      user.boostActivationsDate = todayStr;
      user.boostActivationsToday = 0;
    }

    if (user.boostActivationsToday >= COIN_CONFIG.MAX_BOOST_ACTIVATIONS_PER_DAY) {
      return res.status(400).json({
        success: false,
        message: `Aaj ke liye Boost limit (${COIN_CONFIG.MAX_BOOST_ACTIVATIONS_PER_DAY}) khatam ho gayi hai. Kal phir try karein.`,
      });
    }

    const now = new Date();
    const base = user.boostActiveUntil && new Date(user.boostActiveUntil) > now ? new Date(user.boostActiveUntil) : now;
    const newExpiry = new Date(base.getTime() + COIN_CONFIG.BOOST_DURATION_MINUTES * 60 * 1000);

    user.boostActiveUntil = newExpiry;
    user.boostActivationsToday += 1;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `⚡ Boost active! Agle ${COIN_CONFIG.BOOST_DURATION_MINUTES} minute tak 2x coins milenge.`,
      data: {
        boostActiveUntil: newExpiry,
        boostRemainingSeconds: Math.round((newExpiry.getTime() - now.getTime()) / 1000),
        activationsLeftToday: COIN_CONFIG.MAX_BOOST_ACTIVATIONS_PER_DAY - user.boostActivationsToday,
      },
    });
  } catch (error) {
    console.error("activateBoost error:", error);
    return res.status(500).json({ success: false, message: "Boost activate karte waqt error aaya." });
  }
};
