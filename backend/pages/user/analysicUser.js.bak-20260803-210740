import mongoose from "mongoose";
import Performance from "../../models/Performance.js";
import Blueprint from "../../models/bluePrint.js";
import { Question as RowQuestion } from "../../models/rowQuestionSchema.js";
import HiddenQuestion from "../../models/HiddenQuestion.js"; // 👈 naya

// ─────────────────────────────────────────────
// PAGE 1 — FUNCTION 1
// Overview: average score, lifetime graph, subject list (last 3)
// Route: GET /analysis/overview/:userId/:examName
// ─────────────────────────────────────────────
export const getAllAnalysis1stPage = async (req, res) => {
  try {
    let { userId, examName } = req.params;

    if (userId === "active_user") {
      if (!req.user || !req.user._id) {
        return res.status(401).json({ success: false, message: "User auth token missing ya invalid hai!" });
      }
      userId = req.user._id;
    }

    // 1. Sare mocks fetch karo
    const allTests = await Performance.find({ userId, examName }).sort({ createdAt: -1 });

    if (!allTests || allTests.length === 0) {
      return res.status(200).json({
        success: true,
        message: "User ne abhi tak koi mock nahi diya hai.",
        data: null,
      });
    }

    const last3Tests = allTests.slice(0, 3);

    // ─────────────────────────────────────────────
    // 👇 NAYA: Average Score — ab raw marks ka seedha average NAHI hai.
    //
    // Purani dikkat: Full Mock (total marks 100) aur Mini Mock (total
    // marks 20) dono ke totalScore ko seedha average kar dete the, aur
    // frontend usko "%" laga ke dikhata tha — jo galat hai, kyunki wo
    // number kabhi kisi total ke against calculate hi nahi hua tha.
    //
    // Naya tarika:
    // 1. Har test ka % nikalo — uske APNE blueprint ke total marks
    //    (totalQuestions * marksPerQuestion) ke against
    // 2. In percentages ka average nikalo
    // 3. Us average % ko is EXAM ke "primary" blueprint (Full Mock ko
    //    priority, warna jo bhi pehla mile) ke total marks se multiply
    //    karke ek fixed number bana do — yahi "Aapka Average Score"
    //    ki jagah dikhega (jaise "72/100", % nahi)
    // ─────────────────────────────────────────────
    const examBlueprints = await Blueprint.find({ examName }).select(
      "blueprintName totalQuestions marksPerQuestion mockType"
    );

    const blueprintByName = {};
    examBlueprints.forEach((bp) => {
      blueprintByName[bp.blueprintName] = bp;
    });

    const testPercentages = [];
    for (const test of last3Tests) {
      const bp = blueprintByName[test.blueprintName];
      if (!bp) continue; // blueprint delete/rename ho chuka — is test ko skip karo

      const maxMarks = bp.totalQuestions * bp.marksPerQuestion;
      if (maxMarks <= 0) continue;

      const rawPercent = (test.totalScore / maxMarks) * 100;
      testPercentages.push(Math.max(0, rawPercent)); // negative marking se percent negative na dikhe
    }

    const primaryBlueprint =
      examBlueprints.find((b) => b.mockType === "Full") || examBlueprints[0] || null;

    let averageScore = null;
    let averageScoreOutOf = null;

    if (testPercentages.length > 0 && primaryBlueprint) {
      const avgPercent = testPercentages.reduce((sum, p) => sum + p, 0) / testPercentages.length;
      averageScoreOutOf = Math.round(primaryBlueprint.totalQuestions * primaryBlueprint.marksPerQuestion);
      averageScore = Math.round((avgPercent / 100) * averageScoreOutOf);
    } else {
      // Safety fallback — blueprint data kisi wajah se na mile to bhi
      // page crash na ho, purana raw-average dikha do
      const totalScoreSum = last3Tests.reduce((acc, test) => acc + test.totalScore, 0);
      averageScore = Number((totalScoreSum / last3Tests.length).toFixed(2));
    }

    // 3. Graph Data — LIFETIME ke saare mocks
    const graphData = allTests
      .map((test) => ({
        performanceId: test._id,
        score: test.totalScore,
        date: test.createdAt,
        blueprintName: test.blueprintName,
      }))
      .reverse();

    // 4. Subject-wise accuracy + time — last 3 mocks se
    const subjectMap = {};
    last3Tests.forEach((test) => {
      if (test.subjectAnalysis && test.subjectAnalysis.length > 0) {
        test.subjectAnalysis.forEach((sub) => {
          if (!subjectMap[sub.subjectName]) {
            subjectMap[sub.subjectName] = {
              totalAcc: 0,
              totalTime: 0,
              count: 0,
            };
          }
          subjectMap[sub.subjectName].totalAcc += sub.accuracy;
          subjectMap[sub.subjectName].totalTime += sub.averageTimePerQuestion ?? 0;
          subjectMap[sub.subjectName].count += 1;
        });
      }
    });

    const subjectAnalysis = Object.keys(subjectMap).map((name) => ({
      subjectName: name,
      averageAccuracy: Number(
        (subjectMap[name].totalAcc / subjectMap[name].count).toFixed(2)
      ),
      averageTimePerQuestion: Number(
        (subjectMap[name].totalTime / subjectMap[name].count).toFixed(2)
      ),
    }));

    return res.status(200).json({
      success: true,
      data: {
        averageScore,
        averageScoreOutOf, // 👈 NAYA — "72/100" jaisa dikhane ke liye, null bhi ho sakta hai
        totalTestsGiven: allTests.length,
        graphData,
        subjectAnalysis,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ─────────────────────────────────────────────
// PAGE 1 — FUNCTION 2
// Graph click → ek specific mock ka pura breakdown
// (overview summary + sawaal-by-sawaal: sahi/galat/explanation)
// Route: GET /analysis/mock-detail/:performanceId
// ─────────────────────────────────────────────
export const getPerformanceAnalysis = async (req, res) => {
  try {
    const { performanceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(performanceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Performance ID",
      });
    }

    const performance = await Performance.findById(performanceId).populate({
      path: "attemptedQuestions.questionId",
      model: RowQuestion,
    });

    if (!performance) {
      return res.status(404).json({
        success: false,
        message: "Performance nahi mila.",
      });
    }

    const blueprint = await Blueprint.findOne({
      blueprintName: performance.blueprintName,
      examName: performance.examName,
    });

    if (!blueprint) {
      return res.status(404).json({
        success: false,
        message: "Blueprint nahi mila.",
      });
    }

    const totalQuestions = blueprint.totalQuestions;
    const correct = performance.correctCount;
    const wrong = performance.wrongCount;
    const unattempted = performance.unattemptedCount;
    const totalScore = performance.totalScore;

    const accuracy =
      totalQuestions === 0
        ? 0
        : Number(((correct / totalQuestions) * 100).toFixed(2));

    let totalTimeTaken = 0;
    for (const aq of performance.attemptedQuestions) {
      totalTimeTaken += aq.timeTakenInSeconds ?? 0;
    }

    const averageTimePerQuestion =
      totalQuestions === 0
        ? 0
        : Number((totalTimeTaken / totalQuestions).toFixed(2));

    const questionBreakdown = performance.attemptedQuestions.map((aq) => {
      const q = aq.questionId;

      return {
        questionId: q ? q._id : aq.questionId,
        question: q ? q.question : null,
        options: q
          ? {
              option1: q.option1,
              option2: q.option2,
              option3: q.option3,
              option4: q.option4,
            }
          : null,
        correctOption: q ? q.correctOption : null,
        userAnswer: aq.userAnswer,
        isCorrect: aq.isCorrect,
        answerExplain: q ? q.answerExplain : null,
        answerExplainWithPhoto: q ? q.answerExplainWithPhoto : null,
        topicName: q ? q.topicName : null,
        subjectName: q ? q.subjectName : null,
        timeTakenInSeconds: aq.timeTakenInSeconds,
      };
    });

    return res.status(200).json({
      success: true,
      overview: {
        examName: performance.examName,
        blueprintName: performance.blueprintName,
        totalQuestions,
        correct,
        wrong,
        unattempted,
        totalScore,
        accuracy,
        totalTimeTaken,
        averageTimePerQuestion,
      },
      questionBreakdown,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ─────────────────────────────────────────────
// PAGE 2: Subject-wise Analysis
// Route: GET /analysis/subject/:userId/:examName/:subjectName
// ─────────────────────────────────────────────
export const getSubjectAnalysis = async (req, res) => {
  try {
    let { userId, examName, subjectName } = req.params;

    if (userId === "active_user") {
      if (!req.user || !req.user._id) {
        return res.status(401).json({ success: false, message: "User auth token missing ya invalid hai!" });
      }
      userId = req.user._id;
    }

    const last3Tests = await Performance.find({ userId, examName })
      .sort({ createdAt: -1 })
      .limit(3);

    if (!last3Tests || last3Tests.length === 0) {
      return res.status(200).json({
        success: true,
        message: "User ne abhi tak koi mock nahi diya hai.",
        data: null,
      });
    }

    let totalAccuracy = 0;
    let totalTime = 0;
    let subjectFoundCount = 0;
    const graphData = [];

    for (const test of last3Tests) {
      const subData = test.subjectAnalysis
        ? test.subjectAnalysis.find((s) => s.subjectName === subjectName)
        : null;

      if (subData) {
        totalAccuracy += subData.accuracy;
        totalTime += subData.averageTimePerQuestion ?? 0;
        subjectFoundCount++;

        graphData.push({
          performanceId: test._id,
          date: test.createdAt,
          accuracy: subData.accuracy,
        });
      }
    }

    graphData.reverse();

    const averageAccuracy =
      subjectFoundCount === 0
        ? 0
        : Number((totalAccuracy / subjectFoundCount).toFixed(2));

    const averageTimePerQuestion =
      subjectFoundCount === 0
        ? 0
        : Number((totalTime / subjectFoundCount).toFixed(2));

    const allQuestionIds = last3Tests.flatMap((test) =>
      test.attemptedQuestions.map((aq) => aq.questionId).filter(Boolean)
    );

    const questionDocs = await RowQuestion.find({
      _id: { $in: allQuestionIds },
      subjectName: subjectName,
    }).select("_id topicName");

    const topicNameMap = {};
    for (const doc of questionDocs) {
      topicNameMap[doc._id.toString()] = doc.topicName;
    }

    const topicGroups = {};

    for (const test of last3Tests) {
      for (const aq of test.attemptedQuestions) {
        if (!aq.questionId) continue;

        const topicName = topicNameMap[aq.questionId.toString()];
        if (!topicName) continue;

        if (!topicGroups[topicName]) {
          topicGroups[topicName] = {
            correct: 0,
            wrong: 0,
            unattempted: 0,
            total: 0,
            totalTime: 0,
            timedCount: 0,
          };
        }

        topicGroups[topicName].total++;

        if (aq.isCorrect === true) {
          topicGroups[topicName].correct++;
        } else if (aq.isCorrect === false) {
          topicGroups[topicName].wrong++;
        } else {
          topicGroups[topicName].unattempted++;
        }

        if (
          typeof aq.timeTakenInSeconds === "number" &&
          aq.timeTakenInSeconds >= 0
        ) {
          topicGroups[topicName].totalTime += aq.timeTakenInSeconds;
          topicGroups[topicName].timedCount++;
        }
      }
    }

    const topicList = Object.keys(topicGroups).map((topicName) => {
      const { correct, wrong, unattempted, total, totalTime, timedCount } =
        topicGroups[topicName];

      const efficiency =
        total === 0 ? 0 : Number(((correct / total) * 100).toFixed(2));

      const avgTime =
        timedCount === 0
          ? 0
          : Number((totalTime / timedCount).toFixed(2));

      return {
        topicName,
        efficiency,
        totalAttempted: total,
        correctCount: correct,
        wrongCount: wrong,
        unattemptedCount: unattempted,
        averageTimePerQuestion: avgTime,
      };
    });

    const weakTopics = [...topicList]
      .filter((t) => t.totalAttempted > 0)
      .sort((a, b) => {
        const scoreA = a.wrongCount * 2 + a.averageTimePerQuestion / 30;
        const scoreB = b.wrongCount * 2 + b.averageTimePerQuestion / 30;
        return scoreB - scoreA;
      })
      .slice(0, 5)
      .map((t) => ({
        topicName: t.topicName,
        efficiency: t.efficiency,
        wrongCount: t.wrongCount,
        averageTimePerQuestion: t.averageTimePerQuestion,
        reason:
          t.wrongCount > 0 && t.averageTimePerQuestion > 30
            ? "Galat bhi kar rahe ho aur time bhi zyada lag raha hai"
            : t.wrongCount > 0
            ? "Is topic mein galat answers zyada hain"
            : "Is topic mein time zyada lag raha hai",
      }));

    return res.status(200).json({
      success: true,
      data: {
        subjectName,
        averageAccuracy,
        averageTimePerQuestion,
        totalTestsConsidered: subjectFoundCount,
        graphData,
        topicList,
        weakTopics,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Subject analysis fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};


// ─────────────────────────────────────────────
// PAGE 3: Topic-wise Analysis
// Route: GET /analysis/topic/:userId/:examName/:subjectName/:topicName
// ─────────────────────────────────────────────
export const getTopicAnalysis = async (req, res) => {
  try {
    let { userId, examName, subjectName, topicName } = req.params;

    if (userId === "active_user") {
      if (!req.user || !req.user._id) {
        return res.status(401).json({ success: false, message: "User auth token missing ya invalid hai!" });
      }
      userId = req.user._id;
    }

    const allTests = await Performance.find({ userId, examName }).sort({ createdAt: -1 });

    if (!allTests || allTests.length === 0) {
      return res.status(200).json({
        success: true,
        message: "User ne abhi tak koi mock nahi diya hai.",
        data: null,
      });
    }

    const allQuestionIds = allTests.flatMap((test) =>
      test.attemptedQuestions.map((aq) => aq.questionId).filter(Boolean)
    );

    const questionDocs = await RowQuestion.find({
      _id: { $in: allQuestionIds },
      subjectName: subjectName,
      topicName: topicName,
    }).select(
      "_id question option1 option2 option3 option4 correctOption answerExplain answerExplainWithPhoto topicName subjectName"
    );

    const questionMap = {};
    for (const doc of questionDocs) {
      questionMap[doc._id.toString()] = doc;
    }

    // Is user ne jo questions hide kiye hain unki list
    const hiddenDocs = await HiddenQuestion.find({ userId }).select("questionId");
    const hiddenQuestionIds = new Set(hiddenDocs.map((h) => h.questionId.toString()));

    const goodAtQuestions = [];
    const wrongQuestions = [];
    const unattemptedQuestions = [];

    let totalAttempted = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalUnattempted = 0;
    let totalTime = 0;
    let timedCount = 0;

    for (const test of allTests) {
      for (const aq of test.attemptedQuestions) {
        if (!aq.questionId) continue;

        const qId = aq.questionId.toString();
        const qDoc = questionMap[qId];

        if (!qDoc || hiddenQuestionIds.has(qId)) continue;

        totalAttempted++;

        if (typeof aq.timeTakenInSeconds === "number" && aq.timeTakenInSeconds >= 0) {
          totalTime += aq.timeTakenInSeconds;
          timedCount++;
        }

        const entry = {
          performanceId: test._id,
          mockDate: test.createdAt,
          questionId: qDoc._id,
          question: qDoc.question,
          options: {
            option1: qDoc.option1,
            option2: qDoc.option2,
            option3: qDoc.option3,
            option4: qDoc.option4,
          },
          correctOption: qDoc.correctOption,
          userAnswer: aq.userAnswer,
          answerExplain: qDoc.answerExplain,
          answerExplainWithPhoto: qDoc.answerExplainWithPhoto ?? null,
          timeTakenInSeconds: aq.timeTakenInSeconds,
        };

        if (aq.isCorrect === true) {
          totalCorrect++;
          goodAtQuestions.push(entry);
        } else if (aq.isCorrect === false) {
          totalWrong++;
          wrongQuestions.push(entry);
        } else {
          totalUnattempted++;
          unattemptedQuestions.push(entry);
        }
      }
    }

    const efficiency = totalAttempted === 0 ? 0 : Number(((totalCorrect / totalAttempted) * 100).toFixed(2));
    const averageTimePerQuestion = timedCount === 0 ? 0 : Number((totalTime / timedCount).toFixed(2));

    return res.status(200).json({
      success: true,
      data: {
        topicName,
        subjectName,
        summary: {
          efficiency,
          averageTimePerQuestion,
          totalAttempted,
          totalCorrect,
          totalWrong,
          totalUnattempted,
          totalMocksConsidered: allTests.length,
        },
        goodAt: goodAtQuestions,
        wrong: wrongQuestions,
        unattempted: unattemptedQuestions,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Topic analysis fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// Mock test list — user ke sare mocks
// Route: GET /analysis/mock-list/:userId/:examName
// ─────────────────────────────────────────────
export const getUserMockTests = async (req, res) => {
  try {
    const { userId, examName } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID",
      });
    }

    const tests = await Performance.find({ userId, examName })
      .select(
        "_id blueprintName examName totalScore correctCount wrongCount unattemptedCount createdAt"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      totalTests: tests.length,
      data: tests.map((test) => ({
        performanceId: test._id,
        blueprintName: test.blueprintName,
        examName: test.examName,
        totalScore: test.totalScore,
        correctCount: test.correctCount,
        wrongCount: test.wrongCount,
        unattemptedCount: test.unattemptedCount,
        date: test.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Mock Test List fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};