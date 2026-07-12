// controllers/getChallengeLeaderboard.js
import Challenge from "../models/Challenge.js";
import ChallengeAttempt from "../models/ChallengeAttempt.js";

export const getChallengeLeaderboard = async (req, res) => {
  try {
    // ─────────────────────────────────────────────
    // STEP 0: Validation
    // ─────────────────────────────────────────────
    const { challengeCode } = req.params;

    if (!challengeCode) {
      return res.status(400).json({
        success: false,
        message: "Challenge code zaroori hai!",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 1: Challenge dhundo (basic details ke liye)
    // ─────────────────────────────────────────────
    const challenge = await Challenge.findOne({ challengeCode }).select(
      "examName blueprintName totalQuestions durationMinutes createdBy expiresAt createdAt"
    );

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: "Ye challenge nahi mila. Shayad expire ho gaya ho ya code galat ho.",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 2: Sare attempts fetch karo — score ke hisaab se sort
    //
    // Sorting priority:
    // 1. totalScore (zyada score upar)
    // 2. totalTimeTakenInSeconds (same score ho to kam time wala upar — tie-breaker)
    // ─────────────────────────────────────────────
    const attempts = await ChallengeAttempt.find({ challengeId: challenge._id })
      .select(
        "userId userName totalScore correctCount wrongCount unattemptedCount totalTimeTakenInSeconds createdAt"
      )
      .sort({ totalScore: -1, totalTimeTakenInSeconds: 1 });

    // ─────────────────────────────────────────────
    // STEP 3: Rank assign karo aur response format banao
    //
    // Note: Agar do logo ka EXACT same score + time ho (rare case),
    // unhe alag rank milega insertion order ke hisaab se — ye
    // acceptable hai kyunki practically identical score+time
    // hona bahut rare hai.
    // ─────────────────────────────────────────────
    const leaderboard = attempts.map((attempt, index) => ({
      rank: index + 1,
      userId: attempt.userId,
      userName: attempt.userName,
      totalScore: attempt.totalScore,
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount,
      unattemptedCount: attempt.unattemptedCount,
      totalTimeTakenInSeconds: attempt.totalTimeTakenInSeconds,
      submittedAt: attempt.createdAt,
    }));

    // ─────────────────────────────────────────────
    // STEP 4: Response
    // ─────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      data: {
        challenge: {
          examName: challenge.examName,
          blueprintName: challenge.blueprintName,
          totalQuestions: challenge.totalQuestions,
          durationMinutes: challenge.durationMinutes,
          createdBy: challenge.createdBy,
          expiresAt: challenge.expiresAt,
        },
        totalParticipants: leaderboard.length,
        leaderboard,
      },
    });
  } catch (error) {
    console.error("getChallengeLeaderboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya leaderboard fetch karte waqt.",
      error: error.message,
    });
  }
};