// controllers/getAllCustomTests.js
// Student ke active batch ke custom tests dikhata hai. Custom Test
// hamesha ek specific coupon se linked hota hai (koi "global default"
// concept nahi hai, PYQ jaisa) — isliye agar student kisi batch mein
// nahi hai, to khaali list milegi.
import CustomTest from "../models/CustomTest.js";
import CustomTestAttempt from "../models/CustomTestAttempt.js";
import Coupon from "../models/Coupon.js";

export const getAllCustomTests = async (req, res) => {
  try {
    const { examName } = req.params;
    const userId = req.user._id;

    // Student ka activeCoupon check karo — exam bhi match hona chahiye
    let activeCouponId = null;
    if (req.user.activeCoupon) {
      const coupon = await Coupon.findById(req.user.activeCoupon).select("exam");
      if (coupon && coupon.exam === examName) {
        activeCouponId = coupon._id;
      }
    }

    if (!activeCouponId) {
      return res.status(200).json({ success: true, data: [] });
    }

    const tests = await CustomTest.find({
      examName,
      couponId: activeCouponId,
      isActive: true,
    })
      .select("testName totalQuestions durationMinutes marksPerQuestion negativeMarking createdAt")
      .sort({ createdAt: -1 });

    if (tests.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const testIds = tests.map((t) => t._id);
    const attempts = await CustomTestAttempt.find({
      userId,
      testId: { $in: testIds },
    }).select("testId totalScore");

    const statsMap = {};
    for (const a of attempts) {
      const key = a.testId.toString();
      if (!statsMap[key]) statsMap[key] = { attemptsCount: 0, bestScore: -Infinity };
      statsMap[key].attemptsCount++;
      statsMap[key].bestScore = Math.max(statsMap[key].bestScore, a.totalScore);
    }

    const data = tests.map((t) => {
      const stats = statsMap[t._id.toString()];
      return {
        testId: t._id,
        testName: t.testName,
        totalQuestions: t.totalQuestions,
        durationMinutes: t.durationMinutes,
        marksPerQuestion: t.marksPerQuestion,
        negativeMarking: t.negativeMarking,
        attemptsCount: stats ? stats.attemptsCount : 0,
        bestScore: stats ? stats.bestScore : null,
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("getAllCustomTests error:", error);
    return res.status(500).json({
      success: false,
      message: "Custom Tests list fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};