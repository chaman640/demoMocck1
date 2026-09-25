import Promoter from "../models/Promoter.js";
import Teacher from "../models/Teacher.js";
import Coupon from "../models/Coupon.js";

export const creditQuestionsToCommissionHolders = async (user, questionsAttempted) => {
  try {
    if (!user || !questionsAttempted || questionsAttempted <= 0) return;

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
