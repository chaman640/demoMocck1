import Coupon from "../models/Coupon.js";
import Blueprint from "../models/bluePrint.js";
import Performance from "../models/Performance.js";
import User from "../models/User.js";

export const getMockLeaderboardBlueprints = async (req, res) => {
  try {
    if (!req.teacher.activeCoupon) {
      return res.status(400).json({ success: false, message: "Please select your active batch first." });
    }
    const coupon = await Coupon.findById(req.teacher.activeCoupon).select("exam");
    if (!coupon) return res.status(404).json({ success: false, message: "Active batch not found." });

    const blueprints = await Blueprint.find({ examName: coupon.exam }).select(
      "blueprintName mockType totalQuestions marksPerQuestion"
    );

    return res.status(200).json({ success: true, data: blueprints });
  } catch (error) {
    console.error("getMockLeaderboardBlueprints error:", error);
    return res.status(500).json({ success: false, message: "Could not load the list of mocks." });
  }
};

export const getMockLeaderboard = async (req, res) => {
  try {
    const { blueprintName } = req.params;
    if (!req.teacher.activeCoupon) {
      return res.status(400).json({ success: false, message: "Please select your active batch first." });
    }
    const coupon = await Coupon.findById(req.teacher.activeCoupon).select("exam name");
    if (!coupon) return res.status(404).json({ success: false, message: "Active batch not found." });

    const blueprint = await Blueprint.findOne({ examName: coupon.exam, blueprintName });
    if (!blueprint) return res.status(404).json({ success: false, message: "This mock was not found." });

    const batchStudents = await User.find({ activeCoupon: req.teacher.activeCoupon }).select("_id name phone");
    const studentIds = batchStudents.map((s) => s._id);

    const attemptRows = await Performance.aggregate([
      { $match: { userId: { $in: studentIds }, examName: coupon.exam, blueprintName } },
      { $sort: { totalScore: -1 } },
      {
        $group: {
          _id: "$userId",
          bestScore: { $first: "$totalScore" },
          attemptsCount: { $sum: 1 },
          lastAttemptAt: { $max: "$createdAt" },
        },
      },
    ]);

    const attemptMap = new Map(attemptRows.map((a) => [a._id.toString(), a]));

    const maxScore = blueprint.totalQuestions * blueprint.marksPerQuestion;

    const allRows = batchStudents.map((s) => {
      const a = attemptMap.get(s._id.toString());
      if (!a) return { studentId: s._id, name: s.name, phone: s.phone, attempted: false };
      return {
        studentId: s._id,
        name: s.name,
        phone: s.phone,
        attempted: true,
        bestScore: a.bestScore,
        attemptsCount: a.attemptsCount,
        lastAttemptAt: a.lastAttemptAt,
      };
    });

    const leaderboard = allRows
      .filter((r) => r.attempted)
      .sort((a, b) => b.bestScore - a.bestScore)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    const notAttempted = allRows.filter((r) => !r.attempted);

    return res.status(200).json({
      success: true,
      data: {
        blueprintName,
        maxScore,
        totalBatchStudents: batchStudents.length,
        totalAttempted: leaderboard.length,
        leaderboard,
        notAttempted,
      },
    });
  } catch (error) {
    console.error("getMockLeaderboard error:", error);
    return res.status(500).json({ success: false, message: "Could not load the leaderboard." });
  }
};
