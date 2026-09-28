import User from "../models/User.js";
import { buildStreakCalendar, getStreakStatus } from "../utils/streakEngine.js";

export const getStreakCalendar = async (req, res) => {
  try {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;

    if (month < 1 || month > 12 || year < 2000 || year > 2100) {
      return res.status(400).json({ success: false, message: "Month 1 se 12 aur year 2000 se 2100 ke beech hona chahiye." });
    }

    const user = await User.findById(req.user._id).select("activityDates longestStreak");
    if (!user) {
      return res.status(404).json({ success: false, message: "User nahi mila!" });
    }

    const days = buildStreakCalendar(user.activityDates, year, month);
    const { currentStreak } = getStreakStatus(user.activityDates);

    return res.status(200).json({
      success: true,
      data: {
        year,
        month,
        days,
        currentStreak,
        longestStreak: user.longestStreak || 0,
      },
    });
  } catch (error) {
    console.error("getStreakCalendar error:", error);
    return res.status(500).json({ success: false, message: "Streak calendar fetch nahi ho paya." });
  }
};
