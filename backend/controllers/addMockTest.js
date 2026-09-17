// controllers/addMocktest.js
//
// 🆕 REDESIGN — Batch-Exclusive-With-Fallback
//
// PEHLE: student agar kisi batch (coupon) mein tha, uska POORA mock test
// sirf uske teacher ke daale hue questions se banta tha. Agar teacher ne
// kisi subject mein kam/koi question na daala ho, us subject mein sawaal
// hi nahi aate the (ya poora mock chhota reh jaata).
//
// AB: har subject ke liye PEHLE teacher/batch ka apna pool try hota hai.
// Agar wahan `questionCount` poora nahi ho paata, bacha hua hissa admin
// ke GLOBAL question bank se fill hota hai. Matlab:
//   - Teacher ne jo daala, student ko wahi pehle dikhega
//   - Teacher ka pool khatam/kam ho to admin ka global bank kaam aayega
//   - Free/no-batch student jaisa pehle tha waisa hi — seedha global pool
import mongoose from "mongoose";
import Blueprint from "../models/bluePrint.js";
import Performance from "../models/Performance.js";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import { Question } from "../models/rowQuestionSchema.js";

// ─────────────────────────────────────────────
// HELPER 1: Fisher-Yates Shuffle (unbiased)
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
// HELPER 2: String IDs → ObjectId array
// ─────────────────────────────────────────────
const toObjectIds = (idIterable) =>
  Array.from(idIterable)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

// ─────────────────────────────────────────────
// HELPER 3: Topic name normalize karo
// ─────────────────────────────────────────────
const normalizeTopic = (t) => (t ? t.trim().toLowerCase() : "");

const MAX_EXTRA_PER_TOPIC = 2; // base 1 + max 2 extra = total max 3 per topic
const MAX_PER_TOPIC = 1 + MAX_EXTRA_PER_TOPIC; // = 3

// ─────────────────────────────────────────────
// 🆕 CORE: Ek subject ke liye questions select karta hai — bilkul wahi
// weak-topic-priority + base/extra allocation algorithm jo pehle seedha
// controller ke andar tha, ab reusable function mein hai taaki isse
// batch-pool aur global-pool dono ke liye alag-alag chalaya ja sake.
//
// excludeIds — in dono se bachna hai: (a) student ke purane attempted
// sawaal, (b) is subject mein pehle pass (batch pool) se already select
// hue sawaal, taaki global-fallback pass wahi sawaal dobara na uthaye.
// ─────────────────────────────────────────────
async function selectQuestionsForSubject({
  examName,
  subjectConfig,
  couponFilter,
  excludeIds,
  weakTopicMap,
  isNewUser,
}) {
  const { subjectName, questionCount, importantTopics = [] } = subjectConfig;
  const importantTopicsNorm = importantTopics.map(normalizeTopic);
  const excludeIdsArray = toObjectIds(excludeIds);

  // Phase 1: Unused questions (jo pehle attempt/select nahi hue)
  const unusedQuestions = await Question.aggregate([
    {
      $match: {
        examName: { $in: [examName] },
        subjectName: subjectName,
        _id: { $nin: excludeIdsArray },
        ...couponFilter,
      },
    },
    {
      $project: {
        _id: 1, question: 1, option1: 1, option2: 1, option3: 1, option4: 1,
        correctOption: 1, topicName: 1, subjectName: 1, questionNumber: 1,
      },
    },
    { $group: { _id: "$topicName", questions: { $push: "$$ROOT" } } },
    { $project: { topicName: "$_id", questions: { $slice: ["$questions", MAX_PER_TOPIC] } } },
  ]);

  // Phase 2: Fallback — jin topics ke unused questions nahi mile
  const unusedTopicNames = unusedQuestions.map((g) => g._id);

  const allTopicsDistinct = await Question.distinct("topicName", {
    examName: { $in: [examName] },
    subjectName: subjectName,
    ...couponFilter,
  });

  if (allTopicsDistinct.length === 0) {
    return { questions: [], allTopicsDistinct: [] }; // is pool mein is subject ka koi question hi nahi
  }

  const topicsWithNoUnused = allTopicsDistinct.filter((t) => !unusedTopicNames.includes(t));

  let fallbackQuestions = [];
  if (topicsWithNoUnused.length > 0) {
    fallbackQuestions = await Question.aggregate([
      {
        $match: {
          examName: { $in: [examName] },
          subjectName: subjectName,
          topicName: { $in: topicsWithNoUnused },
          ...couponFilter,
        },
      },
      {
        $project: {
          _id: 1, question: 1, option1: 1, option2: 1, option3: 1, option4: 1,
          correctOption: 1, topicName: 1, subjectName: 1, questionNumber: 1,
        },
      },
      { $group: { _id: "$topicName", questions: { $push: "$$ROOT" } } },
      { $project: { topicName: "$_id", questions: { $slice: ["$questions", MAX_PER_TOPIC * 3] } } },
    ]);
  }

  // Topic question pool banao: { topicName: [shuffled questions] }
  const topicQuestionPool = {};
  for (const group of [...unusedQuestions, ...fallbackQuestions]) {
    const topicName = group._id || group.topicName;
    if (!topicName) continue;
    const shuffled = fisherYatesShuffle(group.questions);
    topicQuestionPool[topicName] = shuffled.slice(0, MAX_PER_TOPIC);
  }

  const topicPointer = {};
  Object.keys(topicQuestionPool).forEach((t) => (topicPointer[t] = 0));

  const topicSelectedCount = {};
  allTopicsDistinct.forEach((t) => (topicSelectedCount[t] = 0));

  const selectedIdsThisSubject = new Set();

  const pickFromTopic = (topic) => {
    const pool = topicQuestionPool[topic];
    if (!pool) return null;
    const ptr = topicPointer[topic] || 0;
    if (ptr >= pool.length) return null;
    const q = pool[ptr];
    topicPointer[topic] = ptr + 1;
    return q;
  };

  // ── BASE ALLOCATION — topics sorted by weak severity ──
  let baseAllocated = 0;
  let orderedTopicsForBase = [...allTopicsDistinct];
  if (!isNewUser) {
    const subjectNorm = normalizeTopic(subjectName);
    const weakTopicsThisSubject = weakTopicMap[subjectNorm] || {};
    orderedTopicsForBase.sort((a, b) => {
      const wa = weakTopicsThisSubject[normalizeTopic(a)] || 0;
      const wb = weakTopicsThisSubject[normalizeTopic(b)] || 0;
      return wb - wa;
    });
  }

  for (const topic of orderedTopicsForBase) {
    if (baseAllocated >= questionCount) break;
    const q = pickFromTopic(topic);
    if (q) {
      selectedIdsThisSubject.add(q._id.toString());
      topicSelectedCount[topic] = 1;
      baseAllocated++;
    }
  }

  // ── EXTRA — priority + severity ──
  let extraNeeded = questionCount - baseAllocated;
  let extraTopicPool = [];

  if (extraNeeded <= 0) {
    extraTopicPool = [];
  } else if (isNewUser) {
    const importantInDB = allTopicsDistinct.filter((t) => importantTopicsNorm.includes(normalizeTopic(t)));
    const nonImportantTopics = allTopicsDistinct.filter((t) => !importantTopicsNorm.includes(normalizeTopic(t)));
    extraTopicPool = [...importantInDB, ...nonImportantTopics];
  } else {
    const subjectNorm = normalizeTopic(subjectName);
    const weakTopicsThisSubject = weakTopicMap[subjectNorm] || {};
    const importantInDB = allTopicsDistinct.filter((t) => importantTopicsNorm.includes(normalizeTopic(t)));

    const p1 = importantInDB
      .filter((t) => (weakTopicsThisSubject[normalizeTopic(t)] || 0) > 0)
      .sort((a, b) => (weakTopicsThisSubject[normalizeTopic(b)] || 0) - (weakTopicsThisSubject[normalizeTopic(a)] || 0));
    const p2 = importantInDB.filter((t) => (weakTopicsThisSubject[normalizeTopic(t)] || 0) === 0);
    const p3 = allTopicsDistinct
      .filter((t) => !importantTopicsNorm.includes(normalizeTopic(t)) && (weakTopicsThisSubject[normalizeTopic(t)] || 0) > 0)
      .sort((a, b) => (weakTopicsThisSubject[normalizeTopic(b)] || 0) - (weakTopicsThisSubject[normalizeTopic(a)] || 0));
    const p4 = allTopicsDistinct.filter((t) => !importantTopicsNorm.includes(normalizeTopic(t)) && (weakTopicsThisSubject[normalizeTopic(t)] || 0) === 0);

    extraTopicPool = [...p1, ...p2, ...p3, ...p4];
  }

  if (extraTopicPool.length > 0 && extraNeeded > 0) {
    let extraPoolIndex = 0;
    let loopGuard = 0;
    const maxLoopIterations = extraTopicPool.length * MAX_EXTRA_PER_TOPIC * 2;

    while (extraNeeded > 0 && loopGuard < maxLoopIterations) {
      loopGuard++;
      const topic = extraTopicPool[extraPoolIndex % extraTopicPool.length];
      extraPoolIndex++;

      const actualBaseCount = topicSelectedCount[topic] > 0 ? 1 : 0;
      const currentCount = topicSelectedCount[topic] || 0;
      const extraAlreadyTaken = currentCount - actualBaseCount;
      if (extraAlreadyTaken >= MAX_EXTRA_PER_TOPIC) continue;

      const q = pickFromTopic(topic);
      if (q) {
        const qId = q._id.toString();
        if (!selectedIdsThisSubject.has(qId)) {
          selectedIdsThisSubject.add(qId);
          topicSelectedCount[topic] = (topicSelectedCount[topic] || 0) + 1;
          extraNeeded--;
        }
      }
    }
  }

  // ── Final questions — already-fetched pool se nikalo (no extra DB call) ──
  const allFetchedQuestions = [
    ...unusedQuestions.flatMap((g) => g.questions),
    ...fallbackQuestions.flatMap((g) => g.questions),
  ];

  // 🔒 correctOption yahan nahi bhejte — DevTools Network tab mein cheating
  // rokne ke liye. isCorrect backend (addPerformence.js) khud check karta hai.
  const questions = allFetchedQuestions
    .filter((q) => selectedIdsThisSubject.has(q._id.toString()))
    .map((q) => ({
      _id: q._id,
      question: q.question,
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
      topicName: q.topicName,
      subjectName: q.subjectName,
      questionNumber: q.questionNumber,
    }));

  return { questions, allTopicsDistinct };
}

export const addMocktest = async (req, res) => {
  try {
    // ─────────────────────────────────────────────
    // STEP 0: Validation
    // ─────────────────────────────────────────────
    const { examName, blueprintName } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "Login zaroori hai!" });
    }
    const userId = req.user._id;

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
    // STEP 1.5: User ka activeCoupon nikalo (batch-scoping ke liye)
    // ─────────────────────────────────────────────
    const user = await User.findById(userId).select("activeCoupon");
    if (!user) {
      return res.status(404).json({ success: false, message: "User nahi mila!" });
    }

    let activeCouponId = null;
    if (user.activeCoupon) {
      const coupon = await Coupon.findById(user.activeCoupon).select("exam");
      if (coupon && coupon.exam === examName) {
        activeCouponId = coupon._id;
      }
    }

    // ─────────────────────────────────────────────
    // STEP 2: Past attempts nikalo
    // ─────────────────────────────────────────────
    const pastAttempts = await Performance.find({ userId, examName })
      .select("attemptedQuestions.questionId attemptedQuestions.isCorrect")
      .lean();

    const isNewUser = pastAttempts.length === 0;

    // ─────────────────────────────────────────────
    // STEP 3 + 4: Weak Topics Map + Used IDs
    // ─────────────────────────────────────────────
    const weakTopicMap = {};
    const usedQuestionIds = new Set();

    if (!isNewUser) {
      const wrongQuestionIds = [];
      for (const attempt of pastAttempts) {
        for (const aq of attempt.attemptedQuestions || []) {
          if (!aq.questionId) continue;
          const idStr = aq.questionId.toString();
          usedQuestionIds.add(idStr);
          if (aq.isCorrect === false) wrongQuestionIds.push(idStr);
        }
      }

      if (wrongQuestionIds.length > 0) {
        const uniqueWrongIds = [...new Set(wrongQuestionIds)];
        const wrongMeta = await Question.find({ _id: { $in: uniqueWrongIds } })
          .select("subjectName topicName")
          .lean();
        const metaById = new Map(wrongMeta.map((q) => [q._id.toString(), q]));

        for (const idStr of wrongQuestionIds) {
          const meta = metaById.get(idStr);
          if (!meta) continue;
          const subject = normalizeTopic(meta.subjectName);
          const topic = normalizeTopic(meta.topicName);
          if (subject && topic) {
            if (!weakTopicMap[subject]) weakTopicMap[subject] = {};
            if (!weakTopicMap[subject][topic]) weakTopicMap[subject][topic] = 0;
            weakTopicMap[subject][topic]++;
          }
        }
      }
    }

    // ─────────────────────────────────────────────
    // STEP 5: Har subject ke liye questions select karo
    // 🆕 Batch mein hai to PEHLE batch-exclusive pool try, phir jo kami
    // reh jaaye wo global (admin) pool se poori karo.
    // ─────────────────────────────────────────────
    const finalMockSubjects = [];
    const usedIdsArray = toObjectIds(usedQuestionIds);
    let anyGlobalFallbackUsed = false;

    for (const subjectConfig of blueprint.subjects) {
      const primaryFilter = activeCouponId ? { coupon: activeCouponId } : { coupon: null };

      const primaryResult = await selectQuestionsForSubject({
        examName,
        subjectConfig,
        couponFilter: primaryFilter,
        excludeIds: usedQuestionIds,
        weakTopicMap,
        isNewUser,
      });

      let combinedQuestions = primaryResult.questions;

      // 🆕 Fallback — sirf batch-students ke liye, aur sirf jab batch ka
      // pool kam pada ho. Free/no-batch student pehle se hi global pool
      // use kar raha hota hai (primaryFilter khud hi { coupon: null } hai),
      // isliye unke liye ye block chalta hi nahi.
      if (activeCouponId && combinedQuestions.length < subjectConfig.questionCount) {
        const stillNeeded = subjectConfig.questionCount - combinedQuestions.length;
        const alreadyPickedIds = combinedQuestions.map((q) => q._id.toString());

        const fallbackResult = await selectQuestionsForSubject({
          examName,
          subjectConfig: { ...subjectConfig, questionCount: stillNeeded },
          couponFilter: { coupon: null }, // global/admin pool
          excludeIds: new Set([...usedQuestionIds, ...alreadyPickedIds]),
          weakTopicMap,
          isNewUser,
        });

        if (fallbackResult.questions.length > 0) {
          anyGlobalFallbackUsed = true;
          combinedQuestions = [...combinedQuestions, ...fallbackResult.questions];
        }
      }

      const shuffledFinal = fisherYatesShuffle(combinedQuestions);

      finalMockSubjects.push({
        subjectName: subjectConfig.subjectName,
        questionCount: shuffledFinal.length,
        questions: shuffledFinal,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 6 + 7: Response
    // ─────────────────────────────────────────────
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
      message: isNewUser
        ? "Naye user ke liye standard mock test ready hai!"
        : "Aapke performance ke hisaab se personalized mock test ready hai!",
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
        // 🆕 true = kuch questions batch ke pool se kam pade the, global
        // bank se bhare gaye. Frontend chahe to ek chhota badge/note
        // dikha sakta hai jaise "kuch sawaal general bank se hain".
        includesGlobalFallback: anyGlobalFallbackUsed,
        subjects: finalMockSubjects,
      },
    });
  } catch (error) {
    console.error("addMocktest error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya mock test banate waqt.",
      error: error.message,
    });
  }
};
