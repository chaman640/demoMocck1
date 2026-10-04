import ChallengeAttempt from "../models/ChallengeAttempt.js";

export const getMyChallenges = async (req, res) => {
  try {
    const userId = req.user._id;

    const attempts = await ChallengeAttempt.find({ userId })
      .select(
        "challengeCode examName blueprintName createdByName totalScore correctCount wrongCount unattemptedCount createdAt"
      )
      .sort({ createdAt: -1 });

    const data = attempts.map((a) => ({
      challengeCode: a.challengeCode,
      examName: a.examName,
      blueprintName: a.blueprintName,
      createdByName: a.createdByName,
      totalScore: a.totalScore,
      correctCount: a.correctCount,
      wrongCount: a.wrongCount,
      unattemptedCount: a.unattemptedCount,
      attemptedAt: a.createdAt,
    }));

    return res.status(200).json({ success: true, totalChallenges: data.length, data });
  } catch (error) {
    console.error("getMyChallenges error:", error);
    return res.status(500).json({
      success: false,
      message: "Error while fetching the challenges list.",
      error: error.message,
    });
  }
};