// controllers/getChallenge.js
import Challenge from "../models/Challenge.js";
import ChallengeAttempt from "../models/ChallengeAttempt.js";

// Challenge ke questions fetch karta hai test dene ke liye —
// IMPORTANT: correctOption yahan se hata diya jata hai, warna
// user DevTools se seedha answers dekh sakta tha!
export const getChallenge = async (req, res) => {
  try {
    const { challengeCode } = req.params;
    const userId = req.user._id;

    const challenge = await Challenge.findOne({ challengeCode });

    if (!challenge) {
      return res.status(404).json({ success: false, message: "Challenge nahi mila ya expire ho gaya." });
    }
    if (challenge.expiresAt < new Date()) {
      return res.status(410).json({ success: false, message: "Ye challenge expire ho chuka hai." });
    }

    // Check karo user ne already attempt to nahi kiya
    const existingAttempt = await ChallengeAttempt.findOne({ challengeId: challenge._id, userId });

    // correctOption strip karke bhejo — security ke liye
    const safeSubjects = challenge.subjects.map((s) => ({
      subjectName: s.subjectName,
      questions: s.questions.map((q) => ({
        _id: q.questionId,
        question: q.question,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        topicName: q.topicName,
        subjectName: q.subjectName,
      })),
    }));

    return res.status(200).json({
      success: true,
      data: {
        challengeCode: challenge.challengeCode,
        examName: challenge.examName,
        blueprintName: challenge.blueprintName,
        marksPerQuestion: challenge.marksPerQuestion,
        negativeMarking: challenge.negativeMarking,
        durationMinutes: challenge.durationMinutes,
        totalQuestions: challenge.totalQuestions,
        subjects: safeSubjects,
        alreadyAttempted: !!existingAttempt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};