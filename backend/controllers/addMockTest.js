// controllers/addMocktest.js
import mongoose from "mongoose";
import Blueprint from "../models/bluePrint.js";
import Performance from "../models/Performance.js";
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
// BUG FIX 2: Invalid IDs filter karo — null/undefined/broken string crash karte hain
// ─────────────────────────────────────────────
const toObjectIds = (idIterable) =>
  Array.from(idIterable)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(id)) // invalid IDs skip
    .map((id) => new mongoose.Types.ObjectId(id));

// ─────────────────────────────────────────────
// HELPER 3: Topic name normalize karo
// BUG FIX 7: "Sandhi", "sandhi", "SANDHI" → sab "sandhi" ho jayenge
// ─────────────────────────────────────────────
const normalizeTopic = (t) => (t ? t.trim().toLowerCase() : "");

export const addMocktest = async (req, res) => {
  try {
    // ─────────────────────────────────────────────
    // STEP 0: Validation
    // ─────────────────────────────────────────────
    const { userId, examName, blueprintName } = req.body;

    if (!userId || !examName || !blueprintName) {
      return res.status(400).json({
        success: false,
        message: "userId, examName aur blueprintName teeno zaroori hain!",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 1: Blueprint dhundo — dono fields se exact match
    // ─────────────────────────────────────────────
    const blueprint = await Blueprint.findOne({
      examName: examName,
      blueprintName: blueprintName,
    });

    if (!blueprint) {
      return res.status(404).json({
        success: false,
        message: `'${blueprintName}' blueprint nahi mila '${examName}' exam ke liye!`,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 2: Past attempts nikalo + populate
    // ─────────────────────────────────────────────
    const pastAttempts = await Performance.find({
      userId: userId,
      examName: examName,
    }).populate({
      path: "attemptedQuestions.questionId",
      select: "topicName subjectName",
      model: Question,
    });

    const isNewUser = pastAttempts.length === 0;

    // ─────────────────────────────────────────────
    // STEP 3 + 4: Weak Topics Map + Used IDs — ek hi loop mein
    // BUG FIX 7: topic names normalize karke store karo
    // BUG FIX 8: usedQuestionIds sirf Performance se — generate karte waqt add NAHI
    // ─────────────────────────────────────────────
    const weakTopicMap = {};   // { subject_normalized: { topic_normalized: wrongCount } }
    const usedQuestionIds = new Set(); // sirf already ATTEMPTED questions

    if (!isNewUser) {
      for (const attempt of pastAttempts) {
        for (const aq of attempt.attemptedQuestions) {
          if (!aq.questionId) continue;

          // BUG FIX 8: usedQuestionIds sirf yahan — Performance se
          const idStr = aq.questionId._id
            ? aq.questionId._id.toString()
            : aq.questionId.toString();
          if (idStr) usedQuestionIds.add(idStr);

          // Weak topic map — sirf galat jawab
          if (aq.isCorrect === false) {
            const subject = normalizeTopic(aq.questionId.subjectName);
            const topic = normalizeTopic(aq.questionId.topicName);
            if (subject && topic) {
              if (!weakTopicMap[subject]) weakTopicMap[subject] = {};
              if (!weakTopicMap[subject][topic]) weakTopicMap[subject][topic] = 0;
              weakTopicMap[subject][topic]++;
            }
          }
        }
      }
    }

    // ─────────────────────────────────────────────
    // STEP 5: Har subject ke liye questions select karo
    // ─────────────────────────────────────────────
    const finalMockSubjects = [];
    const MAX_EXTRA_PER_TOPIC = 2; // base 1 + max 2 extra = total max 3 per topic
    const MAX_PER_TOPIC = 1 + MAX_EXTRA_PER_TOPIC; // = 3

    // BUG FIX 6: usedIdsArray ek baar banao subjects loop se BAHAR
    // Sab subjects ke liye yahi array use hoga — dobara toObjectIds call nahi
    const usedIdsArray = toObjectIds(usedQuestionIds);

    for (const subjectConfig of blueprint.subjects) {
      const { subjectName, questionCount, importantTopics = [] } = subjectConfig;

      // BUG FIX 7: importantTopics bhi normalize karo comparison ke liye
      const importantTopicsNorm = importantTopics.map(normalizeTopic);

      // ── 5a. Ek hi aggregate mein sab topics ke questions fetch karo ──
      // BUG FIX 3: distinct + aggregate(unused) = 2 calls, pehle 3 thein
      // BUG FIX 4: $project PEHLE lagao — $push: "$$ROOT" se pehle sirf zaruri fields lo
      //            Isse Mongo RAM waste nahi karega poore documents push karke
      // BUG FIX 5+6: $sample aggregate ke andar nahi, JS-side fisherYates se random

      // Phase 1: Unused questions (jo pehle attempt nahi kiye)
      const unusedQuestions = await Question.aggregate([
        {
          $match: {
            examName: { $in: [examName] },
            subjectName: subjectName,
            _id: { $nin: usedIdsArray },
          },
        },
        {
          // BUG FIX 4: $project PEHLE — sirf ye fields chahiye, baaki sab skip
          $project: {
            _id: 1,
            question: 1,
            option1: 1,
            option2: 1,
            option3: 1,
            option4: 1,
            correctOption: 1,
            topicName: 1,
            subjectName: 1,
            questionNumber: 1,
          },
        },
        {
          $group: {
            _id: "$topicName",
            questions: { $push: "$$ROOT" }, // ab sirf projected fields push hongi
          },
        },
        {
          $project: {
            topicName: "$_id",
            questions: { $slice: ["$questions", MAX_PER_TOPIC] },
          },
        },
      ]);

      // Phase 2: Fallback — jin topics ke unused questions nahi mile
      // BUG FIX 3: distinct ki jagah unusedQuestions se hi topic list nikalo
      const unusedTopicNames = unusedQuestions.map((g) => g._id);

      // Sabhi topics dhundho — ek distinct call (unavoidable, distinct alag info deta hai)
      const allTopicsDistinct = await Question.distinct("topicName", {
        examName: { $in: [examName] },
        subjectName: subjectName,
      });

      if (allTopicsDistinct.length === 0) continue; // is subject mein koi question hi nahi

      const topicsWithNoUnused = allTopicsDistinct.filter(
        (t) => !unusedTopicNames.includes(t)
      );

      // BUG FIX 5: Fallback mein bhi random chahiye — JS-side shuffle karunga
      let fallbackQuestions = [];
      if (topicsWithNoUnused.length > 0) {
        fallbackQuestions = await Question.aggregate([
          {
            $match: {
              examName: { $in: [examName] },
              subjectName: subjectName,
              topicName: { $in: topicsWithNoUnused },
            },
          },
          {
            // BUG FIX 4: $project pehle yahan bhi
            $project: {
              _id: 1,
              question: 1,
              option1: 1,
              option2: 1,
              option3: 1,
              option4: 1,
              correctOption: 1,
              topicName: 1,
              subjectName: 1,
              questionNumber: 1,
            },
          },
          {
            $group: {
              _id: "$topicName",
              questions: { $push: "$$ROOT" },
            },
          },
          {
            $project: {
              topicName: "$_id",
              // MAX_PER_TOPIC se zyada fetch karo taaki shuffle ke baad variety ho
              // BUG FIX 5: zyada lo, phir JS mein shuffle karke slice karo
              questions: { $slice: ["$questions", MAX_PER_TOPIC * 3] },
            },
          },
        ]);
      }

      // Topic question pool banao: { topicName: [shuffled questions] }
      // BUG FIX 5: dono phases mein fisherYates shuffle — deterministic nahi rahega
      const topicQuestionPool = {};
      for (const group of [...unusedQuestions, ...fallbackQuestions]) {
        const topicName = group._id || group.topicName;
        if (!topicName) continue;
        // Shuffle karo — unused aur fallback dono
        const shuffled = fisherYatesShuffle(group.questions);
        // Max 3 rakhna hai
        topicQuestionPool[topicName] = shuffled.slice(0, MAX_PER_TOPIC);
      }

      // Pointer: har topic ke liye next pick index
      const topicPointer = {};
      Object.keys(topicQuestionPool).forEach((t) => (topicPointer[t] = 0));

      // Tracker: kitne select hue per topic
      const topicSelectedCount = {};
      allTopicsDistinct.forEach((t) => (topicSelectedCount[t] = 0));

      // Is subject ke selected IDs — same-subject duplicate rokne ke liye
      const selectedIdsThisSubject = new Set();

      // Helper: pool se next question lo
      const pickFromTopic = (topic) => {
        const pool = topicQuestionPool[topic];
        if (!pool) return null;
        const ptr = topicPointer[topic] || 0;
        if (ptr >= pool.length) return null;
        const q = pool[ptr];
        topicPointer[topic] = ptr + 1;
        return q;
      };

      // ── 5b. BASE ALLOCATION ──
      let baseAllocated = 0;

      // BUG FIX 7: Topics sorted by weak severity (normalize karke compare)
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
          const qId = q._id.toString();
          selectedIdsThisSubject.add(qId);
          // BUG FIX 8: usedQuestionIds mein ADD NAHI — sirf selectedIds track karo
          topicSelectedCount[topic] = 1;
          baseAllocated++;
        }
      }

      // ── 5c. Extra count ──
      let extraNeeded = questionCount - baseAllocated;

      // ── 5d. Extra Pool (priority + severity) ──
      let extraTopicPool = [];

      // BUG FIX 1: Agar extraNeeded === 0 ya extraTopicPool empty hoga
      // to while loop chalega hi nahi (maxLoopIterations = 0)
      // lekin explicit guard bhi lagao safety ke liye
      if (extraNeeded <= 0) {
        extraTopicPool = []; // koi extra nahi chahiye
      } else if (isNewUser) {
        const importantInDB = allTopicsDistinct.filter((t) =>
          importantTopicsNorm.includes(normalizeTopic(t))
        );
        const nonImportantTopics = allTopicsDistinct.filter(
          (t) => !importantTopicsNorm.includes(normalizeTopic(t))
        );
        extraTopicPool = [...importantInDB, ...nonImportantTopics];
      } else {
        const subjectNorm = normalizeTopic(subjectName);
        const weakTopicsThisSubject = weakTopicMap[subjectNorm] || {};

        const importantInDB = allTopicsDistinct.filter((t) =>
          importantTopicsNorm.includes(normalizeTopic(t))
        );

        const p1 = importantInDB
          .filter((t) => (weakTopicsThisSubject[normalizeTopic(t)] || 0) > 0)
          .sort((a, b) =>
            (weakTopicsThisSubject[normalizeTopic(b)] || 0) -
            (weakTopicsThisSubject[normalizeTopic(a)] || 0)
          );

        const p2 = importantInDB.filter(
          (t) => (weakTopicsThisSubject[normalizeTopic(t)] || 0) === 0
        );

        const p3 = allTopicsDistinct
          .filter(
            (t) =>
              !importantTopicsNorm.includes(normalizeTopic(t)) &&
              (weakTopicsThisSubject[normalizeTopic(t)] || 0) > 0
          )
          .sort((a, b) =>
            (weakTopicsThisSubject[normalizeTopic(b)] || 0) -
            (weakTopicsThisSubject[normalizeTopic(a)] || 0)
          );

        const p4 = allTopicsDistinct.filter(
          (t) =>
            !importantTopicsNorm.includes(normalizeTopic(t)) &&
            (weakTopicsThisSubject[normalizeTopic(t)] || 0) === 0
        );

        extraTopicPool = [...p1, ...p2, ...p3, ...p4];
      }

      // ── 5e. Extra questions lo round-robin se ──
      // BUG FIX 1: extraTopicPool empty check EXPLICIT — 0 % 0 = NaN avoid
      if (extraTopicPool.length > 0 && extraNeeded > 0) {
        let extraPoolIndex = 0;
        let loopGuard = 0;
        const maxLoopIterations = extraTopicPool.length * MAX_EXTRA_PER_TOPIC * 2;

        while (extraNeeded > 0 && loopGuard < maxLoopIterations) {
          loopGuard++;

          // BUG FIX 1: extraTopicPool.length guaranteed > 0 yahan
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
              // BUG FIX 8: yahan bhi usedQuestionIds mein ADD NAHI
              topicSelectedCount[topic] = (topicSelectedCount[topic] || 0) + 1;
              extraNeeded--;
            }
          }
        }
      }

      // ── 5f. Final questions — already fetched pool se nikalo (no extra DB call) ──
      const allFetchedQuestions = [
        ...unusedQuestions.flatMap((g) => g.questions),
        ...fallbackQuestions.flatMap((g) => g.questions),
      ];

      // 👇 BUG FIX (security): correctOption yahan se HATA diya gaya —
      // pehle ye seedha frontend ko chala jaata tha, aur DevTools ke
      // Network tab mein test dete waqt hi sahi jawab dikh jaata tha.
      // Ab isCorrect backend (addPerformence.js) khud DB se check karega.
      const finalQuestions = allFetchedQuestions
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

      // ── 5g. Final shuffle ──
      const shuffledFinal = fisherYatesShuffle(finalQuestions);

      finalMockSubjects.push({
        subjectName,
        questionCount: shuffledFinal.length,
        questions: shuffledFinal,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 6 + 7: Response
    // ─────────────────────────────────────────────
    const totalActualQuestions = finalMockSubjects.reduce(
      (sum, s) => sum + s.questions.length,
      0
    );

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