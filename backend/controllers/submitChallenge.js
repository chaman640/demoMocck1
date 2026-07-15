// controllers/submitChallenge.js
import Challenge from "../models/Challenge.js";
import ChallengeAttempt from "../models/ChallengeAttempt.js";

export const submitChallenge = async (req, res) => {
  try {
    // ─────────────────────────────────────────────
    // STEP 0: Validation
    // req.user middleware se aayega (userInfo middleware required hai route pe)
    // ─────────────────────────────────────────────
    const userId = req.user._id;
    const userName = req.user.name;
    const { challengeCode } = req.params;
    const { attemptedQuestions } = req.body;

    if (!challengeCode) {
      return res.status(400).json({
        success: false,
        message: "Challenge code zaroori hai!",
      });
    }

    if (!Array.isArray(attemptedQuestions) || attemptedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "attemptedQuestions mein kam se kam ek question hona chahiye!",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 1: Challenge dhundo
    // ─────────────────────────────────────────────
    const challenge = await Challenge.findOne({ challengeCode });

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: "Ye challenge nahi mila. Shayad expire ho gaya ho ya code galat ho.",
      });
    }

    // Expiry check (TTL index MongoDB mein thoda delay se chalta hai,
    // isliye application-level pe bhi check karna safe hai)
    if (challenge.expiresAt && challenge.expiresAt < new Date()) {
      return res.status(410).json({
        success: false,
        message: "Ye challenge expire ho chuka hai.",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 2: Duplicate attempt check
    // Ek user ek challenge sirf ek baar de sakta hai
    // ─────────────────────────────────────────────
    const existingAttempt = await ChallengeAttempt.findOne({
      challengeId: challenge._id,
      userId,
    });

    if (existingAttempt) {
      return res.status(409).json({
        success: false,
        message: "Aap is challenge ko pehle hi attempt kar chuke hain!",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 3: Frozen challenge questions ka lookup map banao
    // (validation ke liye — taaki koi galat isCorrect frontend se
    // bhej ke score manipulate na kar sake, hum khud recalculate karenge)
    // ─────────────────────────────────────────────
    const questionMap = {};
    for (const subj of challenge.subjects) {
      for (const q of subj.questions) {
        questionMap[q.questionId.toString()] = q;
      }
    }

    // ─────────────────────────────────────────────
    // STEP 4: Har attempted question ko validate + score calculate karo
    // BUG-PRONE AREA: Kabhi bhi frontend ke bheje "isCorrect" pe bharosa
    // mat karo — hamesha server-side khud correctOption se compare karo.
    // ─────────────────────────────────────────────
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;
    let totalTimeTakenInSeconds = 0;

    const finalAttemptedQuestions = [];

    for (const aq of attemptedQuestions) {
      const qId = aq.questionId ? aq.questionId.toString() : null;
      const frozenQ = qId ? questionMap[qId] : null;

      // Agar ye question is challenge ka hai hi nahi, skip karo (galat/tampered data)
      if (!frozenQ) continue;

      const userAnswer =
        aq.userAnswer !== undefined && aq.userAnswer !== null && aq.userAnswer !== ""
          ? String(aq.userAnswer)
          : null;

      const isCorrect =
        userAnswer === null ? null : userAnswer === String(frozenQ.correctOption);

      const timeTaken =
        typeof aq.timeTakenInSeconds === "number" && aq.timeTakenInSeconds >= 0
          ? aq.timeTakenInSeconds
          : 0;

      if (isCorrect === true) correctCount++;
      else if (isCorrect === false) wrongCount++;
      else unattemptedCount++;

      totalTimeTakenInSeconds += timeTaken;

      finalAttemptedQuestions.push({
        questionId: frozenQ.questionId,
        userAnswer,
        isCorrect,
        timeTakenInSeconds: timeTaken,
      });
    }

    // Agar koi bhi valid question match nahi hua
    if (finalAttemptedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Koi valid question match nahi hua is challenge ke sath.",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 5: Score calculate karo (frozen marksPerQuestion/negativeMarking se)
    // ─────────────────────────────────────────────
    const totalScore =
      correctCount * challenge.marksPerQuestion -
      wrongCount * challenge.negativeMarking;

    // ─────────────────────────────────────────────
    // STEP 6: ChallengeAttempt save karo
    // ─────────────────────────────────────────────
    const newAttempt = new ChallengeAttempt({
  challengeId: challenge._id,
  challengeCode: challenge.challengeCode,     // 👈 naya
  examName: challenge.examName,               // 👈 naya
  blueprintName: challenge.blueprintName,     // 👈 naya
  createdByName: challenge.createdByName,     // 👈 naya
  userId,
  userName,
      attemptedQuestions: finalAttemptedQuestions,
      totalScore,
      correctCount,
      wrongCount,
      unattemptedCount,
      totalTimeTakenInSeconds,
    });

    await newAttempt.save();

    // ─────────────────────────────────────────────
    // STEP 7: Response — score ke sath-sath current rank bhi bhej do
    // taaki frontend turant "Aap 2nd number pe ho" dikha sake
    // ─────────────────────────────────────────────
    const betterAttemptsCount = await ChallengeAttempt.countDocuments({
      challengeId: challenge._id,
      totalScore: { $gt: totalScore },
    });

    const totalParticipants = await ChallengeAttempt.countDocuments({
      challengeId: challenge._id,
    });

    return res.status(201).json({
      success: true,
      message: "Challenge submit ho gaya!",
      data: {
        attemptId: newAttempt._id,
        totalScore,
        correctCount,
        wrongCount,
        unattemptedCount,
        totalTimeTakenInSeconds,
        currentRank: betterAttemptsCount + 1,
        totalParticipants,
      },
    });
  } catch (error) {
    // Agar duplicate-key error aaya (compound unique index se),
    // to matlab race-condition mein dobara submit ho gaya
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Aap is challenge ko pehle hi attempt kar chuke hain!",
      });
    }

    console.error("submitChallenge error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya challenge submit karte waqt.",
      error: error.message,
    });
  }
};