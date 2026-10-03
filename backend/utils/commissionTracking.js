import Promoter from "../models/Promoter.js";
import Teacher from "../models/Teacher.js";
import Coupon from "../models/Coupon.js";
import User from "../models/User.js";
import { getISTDateString } from "./streakEngine.js";

// Ek student ek din mein itne hi questions ka commission dila sakta hai —
// warna naye mock bana-bana kar (ya teacher khud nakli students se) bina
// limit commission badhaya ja sakta tha
const DAILY_QUESTION_CAP = Number(process.env.COMMISSION_DAILY_QUESTION_CAP) || 500;

/** Aaj ke cap ke andar kitne questions gine ja sakte hain (atomic). */
const reserveDailyQuota = async (userId, requested) => {
  const today = getISTDateString();
  await User.updateOne(
    { _id: userId, commissionDay: { $ne: today } },
    { $set: { commissionDay: today, commissionCountToday: 0 } }
  );
  const after = await User.findOneAndUpdate(
    { _id: userId, commissionDay: today },
    { $inc: { commissionCountToday: requested } },
    { new: true, projection: { commissionCountToday: 1 } }
  );
  if (!after) return 0;
  const before = after.commissionCountToday - requested;
  return Math.max(0, Math.min(requested, DAILY_QUESTION_CAP - before));
};

export const creditQuestionsToCommissionHolders = async (user, requestedQuestions) => {
  try {
    if (!user || !requestedQuestions || requestedQuestions <= 0) return;
    if (!user.promoter && !user.activeCoupon) return;
    const questionsAttempted = await reserveDailyQuota(user._id, requestedQuestions);
    if (questionsAttempted <= 0) return;

    const tasks = [];

    if (user.promoter) {
      tasks.push(
        Promoter.updateOne(
          { _id: user.promoter, status: "active" },
          { $inc: { pendingQuestionsCount: questionsAttempted, totalQuestionsAllTime: questionsAttempted } }
        )
      );
    }

    if (user.activeCoupon) {
      const coupon = await Coupon.findById(user.activeCoupon).select("mainTeacher");
      if (coupon && coupon.mainTeacher) {
        tasks.push(
          Teacher.updateOne(
            { _id: coupon.mainTeacher, role: "main", status: "active" },
            { $inc: { pendingQuestionsCount: questionsAttempted, totalQuestionsAllTime: questionsAttempted } }
          )
        );
      }
    }

    if (tasks.length) await Promise.all(tasks);
  } catch (error) {
    console.error("creditQuestionsToCommissionHolders error:", error.message);
  }
};
