// backend/pages/teacher/analysisTeacher.js
//
// 🆕 REDESIGN — teacher ab student ka sirf "last 3 mocks ka average" nahi,
// poora lifetime picture dekh sakta hai: trend (improve/decline), cross-subject
// weak topics (ek click mein), aur Mock/PYQ/Custom Test teenon ka comparison —
// taaki pata chale student kis TYPE ke test mein sabse zyada struggle karta hai.
//
// Teacher-facing analysis — Main/Sub Teacher apne active-coupon ke
// students ka overview/subject/topic analysis dekh sakte hain.
// STRICT PRIVACY: target student ka activeCoupon teacher ke
// activeCoupon se match karna zaroori hai, warna 403 — kisi doosre
// teacher/batch ke student ka data kabhi access nahi hoga.
import mongoose from "mongoose";
import User from "../../models/User.js";
import Performance from "../../models/Performance.js";
import Blueprint from "../../models/bluePrint.js";
import { Question as RowQuestion } from "../../models/rowQuestionSchema.js";
import HiddenQuestion from "../../models/HiddenQuestion.js";
import { getTestTypeComparison } from "../../utils/classAnalytics.js"; // 🆕 reuse

// ─────────────────────────────────────────────
// Reusable helper — teacher ke activeCoupon ke against student verify
// karta hai. Har teacher-analysis route isko sabse pehle call karega.
// ─────────────────────────────────────────────
const verifyStudentAccess = async (teacher, studentId) => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return { allowed: false, status: 400, message: "Invalid Student ID." };
  }
  if (!teacher.activeCoupon) {
    return { allowed: false, status: 400, message: "Pehle apna active group/coupon select karein." };
  }

  const student = await User.findById(studentId).select("name phone exam activeCoupon");
  if (!student) {
    return { allowed: false, status: 404, message: "Student nahi mila." };
  }

  if (!student.activeCoupon || student.activeCoupon.toString() !== teacher.activeCoupon.toString()) {
    return { allowed: false, status: 403, message: "Ye student aapke active batch mein nahi hai." };
  }

  return { allowed: true, student };
};

// 🆕 Same helper jo student-side analysicUser.js mein hai — % based average
function averagePercent(tests, blueprintByName) {
  const percentages = [];
  for (const test of tests) {
    const bp = blueprintByName[test.blueprintName];
    if (!bp) continue;
    const maxMarks = bp.totalQuestions * bp.marksPerQuestion;
    if (maxMarks <= 0) continue;
    percentages.push(Math.max(0, (test.totalScore / maxMarks) * 100));
  }
  if (percentages.length === 0) return null;
  return percentages.reduce((s, p) => s + p, 0) / percentages.length;
}

function scoreFromPercent(percent, primaryBlueprint) {
  if (percent == null || !primaryBlueprint) return { score: null, outOf: null };
  const outOf = Math.round(primaryBlueprint.totalQuestions * primaryBlueprint.marksPerQuestion);
  return { score: Math.round((percent / 100) * outOf), outOf };
}

// ─────────────────────────────────────────────
// TEACHER — Overview: lifetime average, trend, subject list, cross-subject
// weak topics, test-type comparison (Mock/PYQ/Custom Test)
// Route: GET /teacher/analysis/overview/:studentId/:examName
// ─────────────────────────────────────────────
export const getStudentOverview = async (req, res) => {
  try {
    const { studentId, examName } = req.params;

    const check = await verifyStudentAccess(req.teacher, studentId);
    if (!check.allowed) {
      return res.status(check.status).json({ success: false, message: check.message });
    }

    const allTests = await Performance.find({ userId: studentId, examName }).sort({ createdAt: -1 });

    // 🆕 Test-type comparison chalti hai chahe mock diya ho ya nahi —
    // ho sakta hai student sirf Custom Test/PYQ deta ho, mock kabhi nahi
    const testTypeComparison = await getTestTypeComparison([new mongoose.Types.ObjectId(studentId)], examName);

    if (!allTests || allTests.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Is student ne abhi tak koi mock nahi diya hai.",
        studentName: check.student.name,
        data: { mockDataAvailable: false, testTypeComparison },
      });
    }

    const last3Tests = allTests.slice(0, 3);
    const previous3Tests = allTests.slice(3, 6); // 🆕 trend ke liye

    const examBlueprints = await Blueprint.find({ examName }).select(
      "blueprintName totalQuestions marksPerQuestion negativeMarking mockType"
    );
    const blueprintByName = {};
    examBlueprints.forEach((bp) => { blueprintByName[bp.blueprintName] = bp; });

    const primaryBlueprint = examBlueprints.find((b) => b.mockType === "Full") || examBlueprints[0] || null;

    const recentPercent = averagePercent(last3Tests, blueprintByName);
    let averageScore, averageScoreOutOf;
    if (recentPercent != null && primaryBlueprint) {
      ({ score: averageScore, outOf: averageScoreOutOf } = scoreFromPercent(recentPercent, primaryBlueprint));
    } else {
      const totalScoreSum = last3Tests.reduce((acc, t) => acc + t.totalScore, 0);
      averageScore = Number((totalScoreSum / last3Tests.length).toFixed(2));
      averageScoreOutOf = null;
    }

    // 🆕 Lifetime average
    const lifetimePercent = averagePercent(allTests, blueprintByName);
    const { score: lifetimeAverageScore, outOf: lifetimeAverageScoreOutOf } =
      scoreFromPercent(lifetimePercent, primaryBlueprint);

    // 🆕 Trend
    let trend = null;
    if (previous3Tests.length > 0) {
      const previousPercent = averagePercent(previous3Tests, blueprintByName);
      if (recentPercent != null && previousPercent != null) {
        const diff = recentPercent - previousPercent;
        trend = {
          direction: diff > 2 ? "improving" : diff < -2 ? "declining" : "same",
          changePercent: Number(diff.toFixed(1)),
        };
      }
    }

    const graphData = allTests
      .map((test) => ({ performanceId: test._id, score: test.totalScore, date: test.createdAt, blueprintName: test.blueprintName }))
      .reverse();

    const subjectMap = {};
    last3Tests.forEach((test) => {
      (test.subjectAnalysis || []).forEach((sub) => {
        if (!subjectMap[sub.subjectName]) subjectMap[sub.subjectName] = { totalAcc: 0, totalTime: 0, count: 0 };
        subjectMap[sub.subjectName].totalAcc += sub.accuracy;
        subjectMap[sub.subjectName].totalTime += sub.averageTimePerQuestion ?? 0;
        subjectMap[sub.subjectName].count += 1;
      });
    });

    const subjectAnalysis = Object.keys(subjectMap).map((name) => ({
      subjectName: name,
      averageAccuracy: Number((subjectMap[name].totalAcc / subjectMap[name].count).toFixed(2)),
      averageTimePerQuestion: Number((subjectMap[name].totalTime / subjectMap[name].count).toFixed(2)),
    }));

    // 🆕 Lifetime totals + negative marking impact
    let totalCorrectLifetime = 0, totalWrongLifetime = 0, totalUnattemptedLifetime = 0, marksLostToNegativeLifetime = 0;
    for (const test of allTests) {
      totalCorrectLifetime += test.correctCount || 0;
      totalWrongLifetime += test.wrongCount || 0;
      totalUnattemptedLifetime += test.unattemptedCount || 0;
      const bp = blueprintByName[test.blueprintName];
      if (bp && bp.negativeMarking > 0) marksLostToNegativeLifetime += (test.wrongCount || 0) * bp.negativeMarking;
    }
    marksLostToNegativeLifetime = Number(marksLostToNegativeLifetime.toFixed(2));

    // 🆕 Cross-subject weak topics — lifetime, sirf mock-pool questions se
    // (PYQ/Custom Test ke embedded questions class-analysis mein already
    // cover ho rahe hain; yahan is student ki mock-based weak-topic list hai)
    const allQuestionIds = allTests.flatMap((test) => test.attemptedQuestions.map((aq) => aq.questionId).filter(Boolean));
    const questionDocs = await RowQuestion.find({ _id: { $in: allQuestionIds } }).select("_id topicName subjectName");
    const questionMetaMap = {};
    for (const doc of questionDocs) questionMetaMap[doc._id.toString()] = { topicName: doc.topicName, subjectName: doc.subjectName };

    const topicGroups = {};
    for (const test of allTests) {
      for (const aq of test.attemptedQuestions) {
        if (!aq.questionId) continue;
        const meta = questionMetaMap[aq.questionId.toString()];
        if (!meta || !meta.topicName) continue;
        const key = `${meta.subjectName}::${meta.topicName}`;
        if (!topicGroups[key]) {
          topicGroups[key] = { subjectName: meta.subjectName, topicName: meta.topicName, correct: 0, wrong: 0, total: 0, totalTime: 0, timedCount: 0 };
        }
        const g = topicGroups[key];
        g.total++;
        if (aq.isCorrect === true) g.correct++;
        else if (aq.isCorrect === false) g.wrong++;
        if (typeof aq.timeTakenInSeconds === "number" && aq.timeTakenInSeconds >= 0) { g.totalTime += aq.timeTakenInSeconds; g.timedCount++; }
      }
    }

    const topWeakTopics = Object.values(topicGroups)
      .filter((t) => t.total > 0 && (t.wrong > 0 || t.totalTime / Math.max(t.timedCount, 1) > 30))
      .map((t) => {
        const avgTime = t.timedCount === 0 ? 0 : Number((t.totalTime / t.timedCount).toFixed(2));
        return {
          subjectName: t.subjectName,
          topicName: t.topicName,
          efficiency: Number(((t.correct / t.total) * 100).toFixed(2)),
          totalAttempted: t.total,
          wrongCount: t.wrong,
          averageTimePerQuestion: avgTime,
          weaknessScore: t.wrong * 2 + avgTime / 30,
          reason: t.wrong > 0 && avgTime > 30
            ? "Galat bhi kar raha/rahi hai aur time bhi zyada lag raha hai"
            : t.wrong > 0
            ? "Is topic mein galat answers zyada hain"
            : "Is topic mein time zyada lag raha hai",
        };
      })
      .sort((a, b) => b.weaknessScore - a.weaknessScore)
      .slice(0, 6)
      .map(({ weaknessScore, ...rest }) => rest);

    return res.status(200).json({
      success: true,
      studentName: check.student.name,
      studentPhone: check.student.phone,
      data: {
        mockDataAvailable: true,
        averageScore,
        averageScoreOutOf,
        lifetimeAverageScore,
        lifetimeAverageScoreOutOf,
        totalTestsGiven: allTests.length,
        totalCorrectLifetime,
        totalWrongLifetime,
        totalUnattemptedLifetime,
        marksLostToNegativeLifetime,
        trend,
        graphData,
        subjectAnalysis,
        topWeakTopics,
        testTypeComparison, // 🆕
      },
    });
  } catch (error) {
    console.error("getStudentOverview error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// TEACHER — Ek specific mock ka pura breakdown (🆕 negative marking added)
// Route: GET /teacher/analysis/mock-detail/:studentId/:performanceId
// ─────────────────────────────────────────────
export const getStudentMockDetail = async (req, res) => {
  try {
    const { studentId, performanceId } = req.params;

    const check = await verifyStudentAccess(req.teacher, studentId);
    if (!check.allowed) {
      return res.status(check.status).json({ success: false, message: check.message });
    }

    if (!mongoose.Types.ObjectId.isValid(performanceId)) {
      return res.status(400).json({ success: false, message: "Invalid Performance ID" });
    }

    const performance = await Performance.findOne({ _id: performanceId, userId: studentId }).populate({
      path: "attemptedQuestions.questionId",
      model: RowQuestion,
    });

    if (!performance) {
      return res.status(404).json({ success: false, message: "Performance nahi mila." });
    }

    const blueprint = await Blueprint.findOne({ blueprintName: performance.blueprintName, examName: performance.examName });
    if (!blueprint) {
      return res.status(404).json({ success: false, message: "Blueprint nahi mila." });
    }

    const totalQuestions = blueprint.totalQuestions;
    let totalTimeTaken = 0;
    for (const aq of performance.attemptedQuestions) totalTimeTaken += aq.timeTakenInSeconds ?? 0;
    const averageTimePerQuestion = totalQuestions === 0 ? 0 : Number((totalTimeTaken / totalQuestions).toFixed(2));
    const accuracy = totalQuestions === 0 ? 0 : Number(((performance.correctCount / totalQuestions) * 100).toFixed(2));

    // 🆕 Negative marking breakdown
    const marksLostToNegative = Number((performance.wrongCount * (blueprint.negativeMarking || 0)).toFixed(2));
    const scoreIfLeftBlankInsteadOfWrong = Number((performance.correctCount * blueprint.marksPerQuestion).toFixed(2));

    const questionBreakdown = performance.attemptedQuestions.map((aq) => {
      const q = aq.questionId;
      return {
        questionId: q ? q._id : aq.questionId,
        question: q ? q.question : null,
        options: q ? { option1: q.option1, option2: q.option2, option3: q.option3, option4: q.option4 } : null,
        correctOption: q ? q.correctOption : null,
        userAnswer: aq.userAnswer,
        isCorrect: aq.isCorrect,
        answerExplain: q ? q.answerExplain : null,
        askedIn: q ? q.askedIn : null, // 🆕
        topicName: q ? q.topicName : null,
        subjectName: q ? q.subjectName : null,
        timeTakenInSeconds: aq.timeTakenInSeconds,
      };
    });

    return res.status(200).json({
      success: true,
      studentName: check.student.name,
      overview: {
        examName: performance.examName,
        blueprintName: performance.blueprintName,
        totalQuestions,
        correct: performance.correctCount,
        wrong: performance.wrongCount,
        unattempted: performance.unattemptedCount,
        totalScore: performance.totalScore,
        accuracy,
        totalTimeTaken,
        averageTimePerQuestion,
        // 🆕
        negativeMarking: blueprint.negativeMarking,
        marksLostToNegative,
        scoreIfLeftBlankInsteadOfWrong,
      },
      questionBreakdown,
    });
  } catch (error) {
    console.error("getStudentMockDetail error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// TEACHER — Subject-wise Analysis (koi change nahi — already sahi tha)
// Route: GET /teacher/analysis/subject/:studentId/:examName/:subjectName
// ─────────────────────────────────────────────
export const getStudentSubjectAnalysis = async (req, res) => {
  try {
    const { studentId, examName, subjectName } = req.params;

    const check = await verifyStudentAccess(req.teacher, studentId);
    if (!check.allowed) {
      return res.status(check.status).json({ success: false, message: check.message });
    }

    const last3Tests = await Performance.find({ userId: studentId, examName }).sort({ createdAt: -1 }).limit(3);

    if (!last3Tests || last3Tests.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Is student ne abhi tak koi mock nahi diya hai.",
        studentName: check.student.name,
        data: null,
      });
    }

    let totalAccuracy = 0, totalTime = 0, subjectFoundCount = 0;
    const graphData = [];

    for (const test of last3Tests) {
      const subData = (test.subjectAnalysis || []).find((s) => s.subjectName === subjectName);
      if (subData) {
        totalAccuracy += subData.accuracy;
        totalTime += subData.averageTimePerQuestion ?? 0;
        subjectFoundCount++;
        graphData.push({ performanceId: test._id, date: test.createdAt, accuracy: subData.accuracy });
      }
    }
    graphData.reverse();

    const averageAccuracy = subjectFoundCount === 0 ? 0 : Number((totalAccuracy / subjectFoundCount).toFixed(2));
    const averageTimePerQuestion = subjectFoundCount === 0 ? 0 : Number((totalTime / subjectFoundCount).toFixed(2));

    const allQuestionIds = last3Tests.flatMap((test) => test.attemptedQuestions.map((aq) => aq.questionId).filter(Boolean));
    const questionDocs = await RowQuestion.find({ _id: { $in: allQuestionIds }, subjectName }).select("_id topicName");

    const topicNameMap = {};
    for (const doc of questionDocs) topicNameMap[doc._id.toString()] = doc.topicName;

    const topicGroups = {};
    for (const test of last3Tests) {
      for (const aq of test.attemptedQuestions) {
        if (!aq.questionId) continue;
        const topicName = topicNameMap[aq.questionId.toString()];
        if (!topicName) continue;
        if (!topicGroups[topicName]) topicGroups[topicName] = { correct: 0, wrong: 0, unattempted: 0, total: 0, totalTime: 0, timedCount: 0 };
        topicGroups[topicName].total++;
        if (aq.isCorrect === true) topicGroups[topicName].correct++;
        else if (aq.isCorrect === false) topicGroups[topicName].wrong++;
        else topicGroups[topicName].unattempted++;
        if (typeof aq.timeTakenInSeconds === "number" && aq.timeTakenInSeconds >= 0) {
          topicGroups[topicName].totalTime += aq.timeTakenInSeconds;
          topicGroups[topicName].timedCount++;
        }
      }
    }

    const topicList = Object.keys(topicGroups).map((topicName) => {
      const { correct, wrong, unattempted, total, totalTime, timedCount } = topicGroups[topicName];
      return {
        topicName,
        efficiency: total === 0 ? 0 : Number(((correct / total) * 100).toFixed(2)),
        totalAttempted: total,
        correctCount: correct,
        wrongCount: wrong,
        unattemptedCount: unattempted,
        averageTimePerQuestion: timedCount === 0 ? 0 : Number((totalTime / timedCount).toFixed(2)),
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
        reason: t.wrongCount > 0 && t.averageTimePerQuestion > 30
          ? "Galat bhi kar raha/rahi hai aur time bhi zyada lag raha hai"
          : t.wrongCount > 0
          ? "Is topic mein galat answers zyada hain"
          : "Is topic mein time zyada lag raha hai",
      }));

    return res.status(200).json({
      success: true,
      studentName: check.student.name,
      data: { subjectName, averageAccuracy, averageTimePerQuestion, totalTestsConsidered: subjectFoundCount, graphData, topicList, weakTopics },
    });
  } catch (error) {
    console.error("getStudentSubjectAnalysis error:", error);
    return res.status(500).json({ success: false, message: "Subject analysis fetch karte waqt error aaya.", error: error.message });
  }
};

// ─────────────────────────────────────────────
// TEACHER — Topic-wise Analysis (koi change nahi — already sahi tha)
// Route: GET /teacher/analysis/topic/:studentId/:examName/:subjectName/:topicName
// ─────────────────────────────────────────────
export const getStudentTopicAnalysis = async (req, res) => {
  try {
    const { studentId, examName, subjectName, topicName } = req.params;

    const check = await verifyStudentAccess(req.teacher, studentId);
    if (!check.allowed) {
      return res.status(check.status).json({ success: false, message: check.message });
    }

    const allTests = await Performance.find({ userId: studentId, examName }).sort({ createdAt: -1 });

    if (!allTests || allTests.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Is student ne abhi tak koi mock nahi diya hai.",
        studentName: check.student.name,
        data: null,
      });
    }

    const allQuestionIds = allTests.flatMap((test) => test.attemptedQuestions.map((aq) => aq.questionId).filter(Boolean));
    const questionDocs = await RowQuestion.find({ _id: { $in: allQuestionIds }, subjectName, topicName }).select(
      "_id question option1 option2 option3 option4 correctOption answerExplain askedIn topicName subjectName"
    );

    const questionMap = {};
    for (const doc of questionDocs) questionMap[doc._id.toString()] = doc;

    const hiddenDocs = await HiddenQuestion.find({ userId: studentId }).select("questionId");
    const hiddenQuestionIds = new Set(hiddenDocs.map((h) => h.questionId.toString()));

    const goodAtQuestions = [], wrongQuestions = [], unattemptedQuestions = [];
    let totalAttempted = 0, totalCorrect = 0, totalWrong = 0, totalUnattempted = 0, totalTime = 0, timedCount = 0;

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
          options: { option1: qDoc.option1, option2: qDoc.option2, option3: qDoc.option3, option4: qDoc.option4 },
          correctOption: qDoc.correctOption,
          userAnswer: aq.userAnswer,
          answerExplain: qDoc.answerExplain,
          askedIn: qDoc.askedIn ?? null, // 🆕
          timeTakenInSeconds: aq.timeTakenInSeconds,
        };

        if (aq.isCorrect === true) { totalCorrect++; goodAtQuestions.push(entry); }
        else if (aq.isCorrect === false) { totalWrong++; wrongQuestions.push(entry); }
        else { totalUnattempted++; unattemptedQuestions.push(entry); }
      }
    }

    return res.status(200).json({
      success: true,
      studentName: check.student.name,
      data: {
        topicName,
        subjectName,
        summary: {
          efficiency: totalAttempted === 0 ? 0 : Number(((totalCorrect / totalAttempted) * 100).toFixed(2)),
          averageTimePerQuestion: timedCount === 0 ? 0 : Number((totalTime / timedCount).toFixed(2)),
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
    console.error("getStudentTopicAnalysis error:", error);
    return res.status(500).json({ success: false, message: "Topic analysis fetch karte waqt error aaya.", error: error.message });
  }
};
