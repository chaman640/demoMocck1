// controllers/addMocktest.js
//
// 🆕 REDESIGN v3 — Unseen Passage ab subject ke ANDAR ek topic hai (jaise
// "Hindi & English" subject mein "General Hindi", "General English", aur
// "Unseen Passage (Hindi)" teeno topics ek saath) — v2 mein ye ek alag
// top-level bucket tha jo apna khud ka tab banata tha. Ab wahi subject
// tab mein, us subject ke baaki sawaalon ke saath (lekin unse SHUFFLE
// hoke mile-julke nahi — passage ke sawaal hamesha ek saath, contiguous
// block mein rehte hain, jaise "Q16-20").
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
// 🆕 CORE — ek specific (normal) topic se EXACTLY questionCount questions
// uठाता hai. Pehle "unused" try karta hai, kam pade to usi topic ke andar
// "already seen" se poora karta hai (recycle) — kabhi khaali nahi
// chhodta agar wahan kam se kam KUCH questions maujood hon.
// ─────────────────────────────────────────────
async function selectQuestionsForTopic({ examName, subjectName, topicName, questionCount, couponFilter, excludeIds }) {
  const excludeIdsArray = toObjectIds(excludeIds);

  const projection = {
    _id: 1, question: 1, option1: 1, option2: 1, option3: 1, option4: 1,
    correctOption: 1, topicName: 1, subjectName: 1, questionNumber: 1,
    askedIn: 1,
  };

  const primaryQuery = { examName: { $in: [examName] }, subjectName, topicName, _id: { $nin: excludeIdsArray }, ...couponFilter };
  const unusedPool = await Question.find(primaryQuery, projection).lean();

  let selected = fisherYatesShuffle(unusedPool).slice(0, questionCount);

  if (selected.length < questionCount) {
    const alreadyPicked = toObjectIds(selected.map((q) => q._id.toString()));
    const fallbackPool = await Question.find(
      { examName: { $in: [examName] }, subjectName, topicName, _id: { $nin: [...excludeIdsArray, ...alreadyPicked] }, ...couponFilter },
      projection
    ).lean();
    const stillNeeded = questionCount - selected.length;
    selected = [...selected, ...fisherYatesShuffle(fallbackPool).slice(0, stillNeeded)];
  }

  // 🆕 DIAGNOSTIC LOGGING — FIX: pehle ye "unused pool khaali" hote hi log
  // karta tha, jo ek returning student ke liye NORMAL cheez hai (sab
  // questions dekh chuka, ab recycle ho raha hai) — isse Logs spam ho
  // jaate the, asli problem dikhna band ho jaata. Ab sirf tab log karta
  // hai jab fallback ke BAAD bhi kuch na mile (matlab is topic mein
  // wakai koi bhi question maujood nahi, chahe coupon/examName jo ho) —
  // yehi asli problem ka signal hai.
  if (selected.length === 0) {
    const anyForTopic = await Question.countDocuments({ subjectName, topicName });
    const anyForExam = await Question.countDocuments({ examName: { $in: [examName] } });
    console.log("🔍 [MOCK-DEBUG] Is topic mein bilkul bhi question nahi mila:", JSON.stringify(primaryQuery));
    console.log(`   → Sirf subjectName+topicName match: ${anyForTopic} mile`);
    console.log(`   → Sirf examName "${examName}" match (kahin bhi): ${anyForExam} mile`);
    if (anyForTopic > 0 && anyForExam === 0) {
      console.log(`   ⚠️ examName mismatch! Question ka examName array "${examName}" se match nahi kar raha.`);
    } else if (anyForTopic === 0) {
      console.log(`   ⚠️ subjectName ("${subjectName}") ya topicName ("${topicName}") kahin match nahi ho rahe.`);
    }
  }

  return selected;
}

// ─────────────────────────────────────────────
// 🆕 Unseen Passage block — EK poora passage (uske saare sawaal ek
// saath), examName+subjectName+topicName se dhoondha jaata hai (bilkul
// regular questions jaisa link). Order preserve hota hai (shuffle nahi
// hota) — passage ka natural flow bana rehta hai.
// ─────────────────────────────────────────────
async function buildUnseenPassageBlock({ examName, subjectName, topicName, questionCount, usedQuestionIds }) {
  const passages = await UnseenPassage.find({ examName, subjectName, topicName }).lean();
  if (passages.length === 0) return { questions: [], passageText: null };

  const isFullyUsed = (p) => p.questions.every((q) => usedQuestionIds.has(q._id.toString()));
  const freshPassages = passages.filter((p) => !isFullyUsed(p));
  const candidatePool = freshPassages.length > 0 ? freshPassages : passages;

  const wellSized = candidatePool.filter((p) => p.questions.length >= questionCount);
  const finalCandidates = wellSized.length > 0 ? wellSized : candidatePool;

  const chosen = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
  const questions = chosen.questions.slice(0, questionCount);

  return {
    passageText: chosen.passageText,
    questions: questions.map((q) => ({
      _id: q._id,
      question: q.question,
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
      topicName,
      subjectName,
      // 🆕 Har question apna passageText khud carry karta hai — taaki
      // frontend sirf INHI questions ke upar passage box dikhaye, baaki
      // subject ke normal sawaalon ke upar nahi.
      passageText: chosen.passageText,
    })),
  };
}

// ─────────────────────────────────────────────
// 🆕 Ek subject ke saare topics ke liye questions jodta hai. Normal
// topics ke sawaal aapas mein SHUFFLE hote hain; Unseen Passage topics
// ke sawaal alag rakhe jaate hain (shuffle nahi) aur sabke baad, apne
// contiguous block mein, jode jaate hain — taaki wo hamesha ek saath
// (jaise Q16-20) rahein, baaki sawaalon mein bikhrein nahi.
// ─────────────────────────────────────────────
async function buildSubjectQuestions({ examName, subjectConfig, activeCouponId, excludeIds }) {
  const normalQuestions = [];
  const passageBlocks = []; // [[q,q,q], [q,q]] — har passage-topic ka apna block
  let anyFallbackUsed = false;

  for (const topicConfig of subjectConfig.topics) {
    if (topicConfig.isUnseenPassage) {
      // 🆕 Passage-type topic — Question pool se nahi, UnseenPassage se
      const block = await buildUnseenPassageBlock({
        examName,
        subjectName: subjectConfig.subjectName,
        topicName: topicConfig.topicName,
        questionCount: topicConfig.questionCount,
        usedQuestionIds: excludeIds,
      });
      if (block.questions.length > 0) passageBlocks.push(block.questions);
      continue;
    }

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

    normalQuestions.push(...topicQuestions);
  }

  // Normal sawaal aapas mein shuffle, passage blocks apne andar order
  // rakhte hue, sabke baad chipka diye jaate hain
  const shuffledNormal = fisherYatesShuffle(normalQuestions);
  const allQuestions = [...shuffledNormal, ...passageBlocks.flat()];

  return { questions: allQuestions, anyFallbackUsed };
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

      // 🆕 BUG FIX: agar kisi subject mein bilkul bhi question na mile
      // (jaise ek Unseen-Passage-only subject jiska passage content abhi
      // add hi nahi hua), to us subject ko tab mein SHAAMIL hi mat karo —
      // warna student us khaali tab par jaate hi app crash ho sakta tha
      // (question[0] exist hi nahi karta).
      if (questions.length === 0) {
        console.log(`🔍 [MOCK-DEBUG] Subject '${subjectConfig.subjectName}' mein ek bhi question nahi mila — is tab ko skip kiya.`);
        continue;
      }

      finalMockSubjects.push({
        subjectName: subjectConfig.subjectName,
        questionCount: questions.length,
        questions,
      });
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
