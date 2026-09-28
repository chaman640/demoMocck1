import User from "../models/User.js";
import { getStreakStatus } from "../utils/streakEngine.js";

export const getRewardsSummary = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "coins activityDates longestStreak boostActiveUntil"
    );
    if (!user) {
      return res.status(404).json({ success: false, message: "User nahi mila!" });
    }

    const { currentStreak, lastActive } = getStreakStatus(user.activityDates);

    const boostActive = Boolean(user.boostActiveUntil && new Date(user.boostActiveUntil) > new Date());
    const boostRemainingSeconds = boostActive
      ? Math.max(0, Math.round((new Date(user.boostActiveUntil).getTime() - Date.now()) / 1000))
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        coins: user.coins || 0,
        currentStreak,
        longestStreak: user.longestStreak || 0,
        lastActive,
        boostActive,
        boostRemainingSeconds,
      },
    });
  } catch (error) {
    console.error("getRewardsSummary error:", error);
    return res.status(500).json({ success: false, message: "Rewards summary fetch nahi ho paya." });
  }
};
