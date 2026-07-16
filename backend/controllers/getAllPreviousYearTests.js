// controllers/getAllPreviousYearTests.js
// Home page ke "Previous Year Papers" button se yahan aayenge — list dikhane ke liye
import PreviousYearTest from "../models/PreviousYearTest.js";
import PreviousYearAttempt from "../models/PreviousYearAttempt.js";

export const getAllPreviousYearTests = async (req, res) => {
  try {
    const { examName } = req.params;
    const userId = req.user._id;

    // 1. Sirf ACTIVE tests dikhao, sabse naye saal wala sabse upar
    const tests = await PreviousYearTest.find({ examName, isActive: true })
      .select("testName year description totalQuestions durationMinutes marksPerQuestion negativeMarking createdAt")
      .sort({ year: -1, createdAt: -1 });

    if (tests.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // 2. Is user ke sare attempts ek saath fetch karo (in-hi tests ke liye)
    const testIds = tests.map((t) => t._id);
    const attempts = await PreviousYearAttempt.find({
      userId,
      testId: { $in: testIds },
    }).select("testId totalScore");

    // 3. testId → { attemptsCount, bestScore } map banao
    const statsMap = {};
    for (const a of attempts) {
      const key = a.testId.toString();
      if (!statsMap[key]) {
        statsMap[key] = { attemptsCount: 0, bestScore: -Infinity };
      }
      statsMap[key].attemptsCount++;
      statsMap[key].bestScore = Math.max(statsMap[key].bestScore, a.totalScore);
    }

    // 4. Response format banao
    const data = tests.map((t) => {
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
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("getAllPreviousYearTests error:", error);
    return res.status(500).json({
      success: false,
      message: "Previous Year Tests list fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};