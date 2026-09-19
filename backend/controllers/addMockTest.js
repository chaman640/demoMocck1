// controllers/addMocktest.js
//
// 🆕 REDESIGN — Blueprint ab har topic ka EXACT questionCount batata hai
// (pehle sirf "importantTopics" naam ki list thi, aur system khud hi
// max-3-per-topic wali limit ke saath dynamically decide karta tha —
// isse bade question-count wale subjects (jaise 30 questions, 4 topics)
// KABHI poore nahi bharte the, chahe kitne bhi questions DB mein hote).
//
// Ab: har topic ke liye seedha utne hi questions uठाए jaate hain jitna
// blueprint mein likha hai — koi hardcoded cap nahi.
//
// 🆕 NAYA — Unseen Passage support. Agar blueprint mein
// `unseenPassages: [{language, questionCount}]` hai, to un sabke liye
// EK poora passage (uske saare sawaal ek saath) uठाया jaata hai, taaki
// student ko passage-based sawaal EK hi passage ke saath, ek block mein
// milein — bikhre hue alag-alag passages se nahi.
import mongoose from "mongoose";
import Blueprint from "../models/bluePrint.js";
import Performance from "../models/Performance.js";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import { Question } from "../models/rowQuestionSchema.js";
import UnseenPassage from "../models/UnseenPassage.js";

const fisherYatesShuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const toObjectIds = (idIterable) =>
  Array.from(idIterable)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

// ─────────────────────────────────────────────
// 🆕 CORE — ek specific topic se EXACTLY questionCount questions uठाता
// hai. Pehle "unused" (student ne kabhi attempt nahi kiye) try karta
// hai, kam pade to usi topic ke andar "already seen" questions se poora
// karta hai (recycle) — kabhi bhi kisi topic ko khaali nahi chhodta agar
// wahan kam se kam KUCH questions maujood hon.
// ─────────────────────────────────────────────
async function selectQuestionsForTopic({ examName, subjectName, topicName, questionCount, couponFilter, excludeIds }) {
  const excludeIdsArray = toObjectIds(excludeIds);

  const projection = {
    _id: 1, question: 1, option1: 1, option2: 1, option3: 1, option4: 1,
    correctOption: 1, topicName: 1, subjectName: 1, questionNumber: 1,
    askedIn: 1, // 🆕 — pehle isse bhejte hi nahi the, isliye live mock mein kabhi dikhta nahi tha
  };

  const primaryQuery = { examName: { $in: [examName] }, subjectName, topicName, _id: { $nin: excludeIdsArray }, ...couponFilter };
  const unusedPool = await Question.find(primaryQuery, projection).lean();

  // 🆕 DIAGNOSTIC LOGGING — agar exact query se 0 mile, to Render Logs mein
  // poori detail print karo: kya query bheji, kitne mile. Isse "spelling
  // match hai ya nahi" jaisa guesswork hamesha ke liye khatam ho jaata hai —
  // Logs seedha bata denge.
  if (unusedPool.length === 0) {
    const anyForTopic = await Question.countDocuments({ subjectName, topicName });
    const anyForExam = await Question.countDocuments({ examName: { $in: [examName] } });
    console.log("🔍 [MOCK-DEBUG] Zero questions mile is query se:", JSON.stringify(primaryQuery));
    console.log(`   → Sirf subjectName+topicName match (examName/coupon ignore karke) karne par: ${anyForTopic} mile`);
    console.log(`   → Sirf examName "${examName}" match karne par (kahin bhi): ${anyForExam} mile`);
    if (anyForTopic > 0 && anyForExam === 0) {
      console.log(`   ⚠️ Matlab: subjectName/topicName sahi hain, lekin examName mismatch hai! Question ka examName array is exact string "${examName}" se match nahi kar raha.`);
    } else if (anyForTopic === 0) {
      console.log(`   ⚠️ Matlab: subjectName ("${subjectName}") ya topicName ("${topicName}") kahin bhi match nahi ho rahe — dono ko bilkul exact (space/bracket samet) compare karein.`);
    }
  }

  let selected = fisherYatesShuffle(unusedPool).slice(0, questionCount);

  if (selected.length < questionCount) {
    const alreadyPicked = toObjectIds(selected.map((q) => q._id.toString()));
    const fallbackPool = await Question.find(
      {
        examName: { $in: [examName] },
        subjectName,
        topicName,
        _id: { $nin: [...excludeIdsArray, ...alreadyPicked] },
        ...couponFilter,
      },
      projection
    ).lean();
    const stillNeeded = questionCount - selected.length;
    selected = [...selected, ...fisherYatesShuffle(fallbackPool).slice(0, stillNeeded)];
  }

  return selected;
}

// ─────────────────────────────────────────────
// 🆕 Ek subject ke saare topics ke liye questions jodta hai. Batch mein
// hai to pehle batch-pool try, kami ho to global pool se poori karta hai
// (same tareeka jo pehle se tha).
// ─────────────────────────────────────────────
async function buildSubjectQuestions({ examName, subjectConfig, activeCouponId, excludeIds }) {
  const allQuestions = [];
  let anyFallbackUsed = false;

  for (const topicConfig of subjectConfig.topics) {
    const primaryFilter = activeCouponId ? { coupon: activeCouponId } : { coupon: null };

    let topicQuestions = await selectQuestionsForTopic({
      examName,
      subjectName: subjectConfig.subjectName,
      topicName: topicConfig.topicName,
      questionCount: topicConfig.questionCount,
      couponFilter: primaryFilter,
      excludeIds,
    });

    if (activeCouponId && topicQuestions.length < topicConfig.questionCount) {
      const stillNeeded = topicConfig.questionCount - topicQuestions.length;
      const alreadyPicked = topicQuestions.map((q) => q._id.toString());
      const globalExtra = await selectQuestionsForTopic({
        examName,
        subjectName: subjectConfig.subjectName,
        topicName: topicConfig.topicName,
        questionCount: stillNeeded,
        couponFilter: { coupon: null },
        excludeIds: new Set([...excludeIds, ...alreadyPicked]),
      });
      if (globalExtra.length > 0) {
        anyFallbackUsed = true;
        topicQuestions = [...topicQuestions, ...globalExtra];
      }
    }

    allQuestions.push(...topicQuestions);
  }

  return { questions: fisherYatesShuffle(allQuestions), anyFallbackUsed };
}

// ─────────────────────────────────────────────
// 🆕 Unseen Passage block banata hai — EK passage (uske saare sawaal
// ek saath). Student ne jo passages pehle POORE kar liye hain unhe
// avoid karne ki koshish karta hai (fresh passage priority), lekin agar
// sab try ho chuke hon to bhi khaali nahi chhodta — recycle kar deta hai.
// ─────────────────────────────────────────────
async function buildUnseenPassageBlock({ examName, blueprintName, language, questionCount, usedQuestionIds }) {
  const passages = await UnseenPassage.find({ examName, blueprintName, language }).lean();
  if (passages.length === 0) return null;

  const isFullyUsed = (p) => p.questions.every((q) => usedQuestionIds.has(q._id.toString()));
  const freshPassages = passages.filter((p) => !isFullyUsed(p));
  const candidatePool = freshPassages.length > 0 ? freshPassages : passages;

  const wellSized = candidatePool.filter((p) => p.questions.length >= questionCount);
  const finalCandidates = wellSized.length > 0 ? wellSized : candidatePool;

  const chosen = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
  const questions = chosen.questions.slice(0, questionCount); // order preserve — passage ka natural flow

  const subjectLabel = `Unseen Passage (${language})`;
  return {
    subjectName: subjectLabel,
    questionCount: questions.length,
    passageText: chosen.passageText, // 🆕 frontend isse tab ke upar dikhayega
    questions: questions.map((q) => ({
      _id: q._id,
      question: q.question,
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
      topicName: subjectLabel,
      subjectName: subjectLabel,
    })),
  };
}

export const addMocktest = async (req, res) => {
  try {
    const { examName, blueprintName } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "Login zaroori hai!" });
    }
    const userId = req.user._id;

    if (!examName || !blueprintName) {
      return res.status(400).json({ success: false, message: "examName aur blueprintName dono zaroori hain!" });
    }

    const blueprint = await Blueprint.findOne({ examName, blueprintName });
    if (!blueprint) {
      return res.status(404).json({ success: false, message: `'${blueprintName}' blueprint nahi mila '${examName}' exam ke liye!` });
    }

    const user = await User.findById(userId).select("activeCoupon");
    if (!user) {
      return res.status(404).json({ success: false, message: "User nahi mila!" });
    }

    let activeCouponId = null;
    if (user.activeCoupon) {
      const coupon = await Coupon.findById(user.activeCoupon).select("exam");
      if (coupon && coupon.exam === examName) activeCouponId = coupon._id;
    }

    const pastAttempts = await Performance.find({ userId, examName })
      .select("attemptedQuestions.questionId")
      .lean();

    const usedQuestionIds = new Set();
    for (const attempt of pastAttempts) {
      for (const aq of attempt.attemptedQuestions || []) {
        if (aq.questionId) usedQuestionIds.add(aq.questionId.toString());
      }
    }
    const isNewUser = pastAttempts.length === 0;

    const finalMockSubjects = [];
    let anyGlobalFallbackUsed = false;

    for (const subjectConfig of blueprint.subjects) {
      const { questions, anyFallbackUsed } = await buildSubjectQuestions({
        examName,
        subjectConfig,
        activeCouponId,
        excludeIds: usedQuestionIds,
      });
      if (anyFallbackUsed) anyGlobalFallbackUsed = true;

      finalMockSubjects.push({
        subjectName: subjectConfig.subjectName,
        questionCount: questions.length,
        questions,
      });
    }

    // 🆕 Unseen Passage blocks — apna khud ka "subject tab" banta hai
    for (const bucket of blueprint.unseenPassages || []) {
      const block = await buildUnseenPassageBlock({
        examName,
        blueprintName,
        language: bucket.language,
        questionCount: bucket.questionCount,
        usedQuestionIds,
      });
      if (block && block.questions.length > 0) {
        finalMockSubjects.push(block);
      }
    }

    const totalActualQuestions = finalMockSubjects.reduce((sum, s) => sum + s.questions.length, 0);

    if (totalActualQuestions === 0) {
      return res.status(404).json({
        success: false,
        message: activeCouponId
          ? "Aapki batch aur global bank — dono mein is exam ke liye abhi questions nahi hain. Apne teacher ya admin se kahein."
          : "Is exam/blueprint ke liye abhi questions available nahi hain.",
      });
    }

    return res.status(200).json({
      success: true,
      message: isNewUser ? "Naye user ke liye standard mock test ready hai!" : "Aapke performance ke hisaab se personalized mock test ready hai!",
      mockTest: {
        examName: blueprint.examName,
        blueprintName: blueprint.blueprintName,
        mockType: blueprint.mockType,
        marksPerQuestion: blueprint.marksPerQuestion,
        negativeMarking: blueprint.negativeMarking,
        totalQuestionsExpected: blueprint.totalQuestions,
        totalQuestionsActual: totalActualQuestions,
        isPersonalized: !isNewUser,
        isBatchContent: !!activeCouponId,
        includesGlobalFallback: anyGlobalFallbackUsed,
        subjects: finalMockSubjects,
      },
    });
  } catch (error) {
    console.error("addMocktest error:", error);
    return res.status(500).json({ success: false, message: "Server mein error aa gaya mock test banate waqt.", error: error.message });
  }
};
