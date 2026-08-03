// controllers/getAllPreviousYearTests.js
// Home page ke "Previous Year Papers" button se yahan aayenge — list dikhane ke liye.
// 👇 UPDATED: Ab coupon-aware — agar student kisi batch mein enrolled hai aur us
// batch ke teacher-created papers maujood hain, to pehle SIRF wahi dikhenge.
// Jab tak student un sabko attempt na kar le, tab tak global/default papers
// nahi dikhenge — jaise hi sab batch-papers attempt ho jaate hain, global
// papers bhi list mein aa jaate hain (spec point 3.5).
import PreviousYearTest from "../models/PreviousYearTest.js";
import PreviousYearAttempt from "../models/PreviousYearAttempt.js";
import Coupon from "../models/Coupon.js";

export const getAllPreviousYearTests = async (req, res) => {
  try {
    const { examName } = req.params;
    const userId = req.user._id;

    // ─────────────────────────────────────────────
    // STEP 1: Student ka activeCoupon check karo — sirf tabhi
    // batch-specific consider karenge jab coupon ka exam bhi
    // wahi ho jo request kiya gaya hai (exam-change edge case safe)
    // ─────────────────────────────────────────────
    let activeCouponId = null;
    if (req.user.activeCoupon) {
      const coupon = await Coupon.findById(req.user.activeCoupon).select("exam");
      if (coupon && coupon.exam === examName) {
        activeCouponId = coupon._id;
      }
    }

    // ─────────────────────────────────────────────
    // STEP 2: Batch-specific (teacher-created, COMPLETE status) tests
    // ─────────────────────────────────────────────
    let batchTests = [];
    if (activeCouponId) {
      batchTests = await PreviousYearTest.find({
        examName,
        couponId: activeCouponId,
        status: "complete",
        isActive: true,
      })
        .select("testName year description totalQuestions durationMinutes marksPerQuestion negativeMarking createdAt")
        .sort({ year: -1, createdAt: -1 });
    }

    // ─────────────────────────────────────────────
    // STEP 3: Global/default tests (koi coupon se linked nahi)
    // ─────────────────────────────────────────────
    const globalTests = await PreviousYearTest.find({
      examName,
      couponId: null,
      isActive: true,
    })
      .select("testName year description totalQuestions durationMinutes marksPerQuestion negativeMarking createdAt")
      .sort({ year: -1, createdAt: -1 });

    // ─────────────────────────────────────────────
    // STEP 4: Agar batch tests hain, check karo student ne SABKO
    // attempt kiya hai ya nahi. Jab tak sab attempt na ho jaayein,
    // sirf batch tests dikhaenge — global tests hide rahenge.
    // ─────────────────────────────────────────────
    let visibleTests = [];
    let isBatchExclusiveView = false;

    if (batchTests.length > 0) {
      const batchTestIds = batchTests.map((t) => t._id);
      const attemptedIdsRaw = await PreviousYearAttempt.distinct("testId", {
        userId,
        testId: { $in: batchTestIds },
      });
      const batchAttemptedIds = new Set(attemptedIdsRaw.map((id) => id.toString()));

      const allBatchTestsAttempted = batchTests.every((t) =>
        batchAttemptedIds.has(t._id.toString())
      );

      if (!allBatchTestsAttempted) {
        visibleTests = batchTests;
        isBatchExclusiveView = true;
      } else {
        visibleTests = [...batchTests, ...globalTests];
      }
    } else {
      visibleTests = globalTests;
    }

    if (visibleTests.length === 0) {
      return res.status(200).json({ success: true, data: [], isBatchExclusiveView });
    }

    // ─────────────────────────────────────────────
    // STEP 5: Is user ke sare attempts ek saath fetch karo (in-hi tests ke liye)
    // ─────────────────────────────────────────────
    const testIds = visibleTests.map((t) => t._id);
    const attempts = await PreviousYearAttempt.find({
      userId,
      testId: { $in: testIds },
    }).select("testId totalScore");

    // ─────────────────────────────────────────────
    // STEP 6: testId → { attemptsCount, bestScore } map banao
    // ─────────────────────────────────────────────
    const statsMap = {};
    for (const a of attempts) {
      const key = a.testId.toString();
      if (!statsMap[key]) {
        statsMap[key] = { attemptsCount: 0, bestScore: -Infinity };
      }
      statsMap[key].attemptsCount++;
      statsMap[key].bestScore = Math.max(statsMap[key].bestScore, a.totalScore);
    }

    // batchTestIds set — response mein isBatchContent flag dikhane ke liye
    const batchTestIdSet = new Set(batchTests.map((t) => t._id.toString()));

    // ─────────────────────────────────────────────
    // STEP 7: Response format banao
    // ─────────────────────────────────────────────
    const data = visibleTests.map((t) => {
      const stats = statsMap[t._id.toString()];
      return {
        testId: t._id,
        testName: t.testName,
        year: t.year,
        description: t.description,
        totalQuestions: t.totalQuestions,
        durationMinutes: t.durationMinutes,
        marksPerQuestion: t.marksPerQuestion,
        negativeMarking: t.negativeMarking,
        attemptsCount: stats ? stats.attemptsCount : 0,
        bestScore: stats ? stats.bestScore : null,
        isBatchContent: batchTestIdSet.has(t._id.toString()), // 👈 NAYA — frontend badge ke liye
      };
    });

    return res.status(200).json({ success: true, data, isBatchExclusiveView });
  } catch (error) {
    console.error("getAllPreviousYearTests error:", error);
    return res.status(500).json({
      success: false,
      message: "Previous Year Tests list fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};