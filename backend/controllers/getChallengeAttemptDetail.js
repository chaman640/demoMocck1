// controllers/getChallengeAttemptDetail.js
import Challenge from "../models/Challenge.js";
import ChallengeAttempt from "../models/ChallengeAttempt.js";

// Ek user ka apna challenge-attempt ka POORA breakdown deta hai —
// question, options, correct answer, user ka answer, explanation — sab kuch.
// Ye endpoint sirf submit ke BAAD kaam aata hai (login required).
export const getChallengeAttemptDetail = async (req, res) => {
  try {
    const userId = req.user._id;
    const { challengeCode } = req.params;

    // ─────────────────────────────────────────────
    // STEP 1: Challenge dhundo (frozen questions ke sath)
    // ─────────────────────────────────────────────
    const challenge = await Challenge.findOne({ challengeCode });

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: "Challenge nahi mila ya expire ho gaya.",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 2: Is user ka attempt dhundo
    // ─────────────────────────────────────────────
    const attempt = await ChallengeAttempt.findOne({
      challengeId: challenge._id,
      userId,
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Aapne abhi tak ye challenge attempt nahi kiya hai.",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 3: Frozen questions ka lookup map banao
    // (question text, options, correctOption, explanation — sab yahi se milega)
    // ─────────────────────────────────────────────
    const questionMap = {};
    for (const subj of challenge.subjects) {
      for (const q of subj.questions) {
        questionMap[q.questionId.toString()] = q;
      }
    }

    // ─────────────────────────────────────────────
    // STEP 4: Har attempted question ko frozen-question-data ke sath merge karo
    // ─────────────────────────────────────────────
    const questionBreakdown = attempt.attemptedQuestions
      .map((aq) => {
        const qId = aq.questionId ? aq.questionId.toString() : null;
        const frozenQ = qId ? questionMap[qId] : null;
        if (!frozenQ) return null; // safety — agar kabhi mismatch ho

        return {
          questionId: frozenQ.questionId,
          question: frozenQ.question,
          options: {
            option1: frozenQ.option1,
            option2: frozenQ.option2,
            option3: frozenQ.option3,
            option4: frozenQ.option4,
          },
          correctOption: frozenQ.correctOption,
          userAnswer: aq.userAnswer,
          isCorrect: aq.isCorrect,
          answerExplain: frozenQ.answerExplain || null,
          topicName: frozenQ.topicName,
          subjectName: frozenQ.subjectName,
          timeTakenInSeconds: aq.timeTakenInSeconds,
        };
      })
      .filter(Boolean);

    // ─────────────────────────────────────────────
    // STEP 5: Response
    // ─────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      data: {
        challengeCode: challenge.challengeCode,
        examName: challenge.examName,
        blueprintName: challenge.blueprintName,
        overview: {
          totalScore: attempt.totalScore,
          correctCount: attempt.correctCount,
          wrongCount: attempt.wrongCount,
          unattemptedCount: attempt.unattemptedCount,
        },
        questionBreakdown,
      },
    });
  } catch (error) {
    console.error("getChallengeAttemptDetail error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya detail fetch karte waqt.",
      error: error.message,
    });
  }
};