// controllers/createChallenge.js
import mongoose from "mongoose";
import Blueprint from "../models/bluePrint.js";
import Challenge from "../models/Challenge.js";
import { Question } from "../models/rowQuestionSchema.js";

// ─────────────────────────────────────────────
// HELPER 1: Fisher-Yates Shuffle (unbiased)
// addMockTest.js jaisa hi — random questions select karne ke liye
// ─────────────────────────────────────────────
const fisherYatesShuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ─────────────────────────────────────────────
// HELPER 2: Unique 6-character challenge code generate karo
// (uppercase letters + digits — link mein short aur readable rahega)
// ─────────────────────────────────────────────
const generateChallengeCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // confusing chars (0,O,1,I) hataye
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

export const createChallenge = async (req, res) => {
  try {
    // ─────────────────────────────────────────────
    // STEP 0: Validation
    // req.user middleware se aayega (userInfo middleware required hai route pe)
    // ─────────────────────────────────────────────
    const userId = req.user._id;
    const { examName, blueprintName } = req.body;

    if (!examName || !blueprintName) {
      return res.status(400).json({
        success: false,
        message: "examName aur blueprintName dono zaroori hain!",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 1: Blueprint dhundo
    // ─────────────────────────────────────────────
    const blueprint = await Blueprint.findOne({ examName, blueprintName });

    if (!blueprint) {
      return res.status(404).json({
        success: false,
        message: `'${blueprintName}' blueprint nahi mila '${examName}' exam ke liye!`,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 2: Har subject ke liye RANDOM questions select karo
    //
    // Note: Ye jaanbujh kar addMockTest.js ke adaptive-weakness
    // logic se SIMPLE rakha gaya hai — kyunki challenge sabke
    // liye FAIR/SAME hona chahiye. Agar personalization laga
    // di to har dost ko alag questions milenge aur comparison
    // hi meaningless ho jayega.
    // ─────────────────────────────────────────────
    const finalSubjects = [];
    let totalActualQuestions = 0;

    for (const subjectConfig of blueprint.subjects) {
      const { subjectName, questionCount } = subjectConfig;

      // Is subject ke saare questions DB se lao
      // 👇 NAYA: answerExplain bhi select kar rahe hain — taaki baad mein
      // "Detailed Analysis" screen pe user ko explanation dikhaya ja sake
      const allQuestions = await Question.find({
        examName: { $in: [examName] },
        subjectName: subjectName,
      }).select(
        "_id question option1 option2 option3 option4 correctOption answerExplain topicName subjectName questionNumber"
      );

      if (allQuestions.length === 0) continue; // is subject ke questions hi nahi hain

      // Shuffle karke jitne chahiye utne le lo
      const shuffled = fisherYatesShuffle(allQuestions);
      const picked = shuffled.slice(0, Math.min(questionCount, shuffled.length));

      const questionsForFreeze = picked.map((q) => ({
        questionId: q._id,
        question: q.question,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        correctOption: q.correctOption,
        answerExplain: q.answerExplain, // 👈 NAYA — frozen question ke sath explanation bhi save
        topicName: q.topicName,
        subjectName: q.subjectName,
        questionNumber: q.questionNumber,
      }));

      finalSubjects.push({
        subjectName,
        questions: questionsForFreeze,
      });

      totalActualQuestions += questionsForFreeze.length;
    }

    if (totalActualQuestions === 0) {
      return res.status(404).json({
        success: false,
        message: "Is blueprint ke liye koi questions available nahi hain!",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 3: Unique challenge code generate karo
    // (collision chance bahut kam hai but phir bhi retry-loop laga rahe hain safety ke liye)
    // ─────────────────────────────────────────────
    let challengeCode;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      challengeCode = generateChallengeCode();
      const existing = await Challenge.findOne({ challengeCode });
      if (!existing) isUnique = true;
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: "Challenge code generate karne mein dikkat aa rahi hai, dobara try karein.",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 4: Duration + expiry calculate karo
    // ─────────────────────────────────────────────
    const durationMinutes =
      blueprint.durationMinutes && blueprint.durationMinutes > 0
        ? blueprint.durationMinutes
        : Math.max(10, Math.round(totalActualQuestions * 0.8));

    // Challenge 7 din baad expire ho jayega — TTL index isse apne aap delete kar dega
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // ─────────────────────────────────────────────
    // STEP 5: Challenge document save karo
    // ─────────────────────────────────────────────
    const newChallenge = new Challenge({
  createdBy: userId,
  createdByName: req.user.name,   // 👈 naya — extra query nahi lagi, req.user mein pehle se hai
  examName,
      blueprintName,
      challengeCode,
      subjects: finalSubjects,
      marksPerQuestion: blueprint.marksPerQuestion,
      negativeMarking: blueprint.negativeMarking,
      durationMinutes,
      totalQuestions: totalActualQuestions,
      expiresAt,
    });

    await newChallenge.save();

    // ─────────────────────────────────────────────
    // STEP 6: Response — shareable code/link ke sath
    // ─────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      message: "Challenge successfully ban gaya! Ab dosto ko share karo.",
      data: {
        challengeCode: newChallenge.challengeCode,
        examName: newChallenge.examName,
        blueprintName: newChallenge.blueprintName,
        totalQuestions: newChallenge.totalQuestions,
        durationMinutes: newChallenge.durationMinutes,
        expiresAt: newChallenge.expiresAt,
      },
    });
  } catch (error) {
    console.error("createChallenge error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya challenge banate waqt.",
      error: error.message,
    });
  }
};