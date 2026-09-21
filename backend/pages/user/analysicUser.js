import mongoose from "mongoose";
import Performance from "../../models/Performance.js";
import Blueprint from "../../models/bluePrint.js";
import { Question as RowQuestion } from "../../models/rowQuestionSchema.js";
import HiddenQuestion from "../../models/HiddenQuestion.js";
import { getBatchAverageTimeForTopic, getBatchAverageTimePerQuestion } from "../../utils/classAnalytics.js";

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

export const getAllAnalysis1stPage = async (req, res) => {
  try {
    let { userId, examName } = req.params;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "User auth token missing ya invalid hai!" });
    }
    userId = req.user._id;

    const allTests = await Performance.find({ userId, examName }).sort({ createdAt: -1 });

    if (!allTests || allTests.length === 0) {
      return res.status(200).json({
        success: true,
        message: "User ne abhi tak koi mock nahi diya hai.",
        data: null,
      });
    }

    const last3Tests = allTests.slice(0, 3);
    const previous3Tests = allTests.slice(3, 6);

    const examBlueprints = await Blueprint.find({ examName }).select(
      "blueprintName totalQuestions marksPerQuestion negativeMarking mockType"
    );

    const blueprintByName = {};
    examBlueprints.forEach((bp) => {
      blueprintByName[bp.blueprintName] = bp;
    });

    const primaryBlueprint =
      examBlueprints.find((b) => b.mockType === "Full") || examBlueprints[0] || null;

    const recentPercent = averagePercent(last3Tests, blueprintByName);
    let averageScore, averageScoreOutOf;
    if (recentPercent != null && primaryBlueprint) {
      ({ score: averageScore, outOf: averageScoreOutOf } = scoreFromPercent(recentPercent, primaryBlueprint));
    } else {
      const totalScoreSum = last3Tests.reduce((acc, test) => acc + test.totalScore, 0);
      averageScore = Number((totalScoreSum / last3Tests.length).toFixed(2));
      averageScoreOutOf = null;
    }

    const lifetimePercent = averagePercent(allTests, blueprintByName);
    const { score: lifetimeAverageScore, outOf: lifetimeAverageScoreOutOf } =
      scoreFromPercent(lifetimePercent, primaryBlueprint);

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

    let totalCorrectLifetime = 0;
    let totalWrongLifetime = 0;
    let totalUnattemptedLifetime = 0;
    let marksLostToNegativeLifetime = 0;

    for (const test of allTests) {
      totalCorrectLifetime += test.correctCount || 0;
      totalWrongLifetime += test.wrongCount || 0;
      totalUnattemptedLifetime += test.unattemptedCount || 0;

      const bp = blueprintByName[test.blueprintName];
      if (bp && bp.negativeMarking > 0) {
        marksLostToNegativeLifetime += (test.wrongCount || 0) * bp.negativeMarking;
      }
    }
    marksLostToNegativeLifetime = Number(marksLostToNegativeLifetime.toFixed(2));

    const allQuestionIds = allTests.flatMap((test) =>
      test.attemptedQuestions.map((aq) => aq.questionId).filter(Boolean)
    );

    const questionDocs = await RowQuestion.find({ _id: { $in: allQuestionIds } }).select(
      "_id topicName subjectName"
    );

    const questionMetaMap = {};
    for (const doc of questionDocs) {
      questionMetaMap[doc._id.toString()] = { topicName: doc.topicName, subjectName: doc.subjectName };
    }

    const topicGroups = {};
    for (const test of allTests) {
      for (const aq of test.attemptedQuestions) {
        if (!aq.questionId) continue;
        const meta = questionMetaMap[aq.questionId.toString()];
        if (!meta || !meta.topicName) continue;

        const key = `${meta.subjectName}::${meta.topicName}`;
        if (!topicGroups[key]) {
          topicGroups[key] = { subjectName: meta.subjectName, topicName: meta.topicName, correct: 0, wrong: 0, unattempted: 0, total: 0, totalTime: 0, timedCount: 0 };
        }

        const g = topicGroups[key];
        g.total++;
        if (aq.isCorrect === true) g.correct++;
        else if (aq.isCorrect === false) g.wrong++;
        else g.unattempted++;

        if (typeof aq.timeTakenInSeconds === "number" && aq.timeTakenInSeconds >= 0) {
          g.totalTime += aq.timeTakenInSeconds;
          g.timedCount++;
        }
      }
    }

    const topWeakTopics = Object.values(topicGroups)
      .filter((t) => t.total > 0 && (t.wrong > 0 || t.totalTime / Math.max(t.timedCount, 1) > 30))
      .map((t) => {
        const avgTime = t.timedCount === 0 ? 0 : Number((t.totalTime / t.timedCount).toFixed(2));
        const efficiency = Number(((t.correct / t.total) * 100).toFixed(2));
        return {
          subjectName: t.subjectName,
          topicName: t.topicName,
          efficiency,
          totalAttempted: t.total,
          wrongCount: t.wrong,
          averageTimePerQuestion: avgTime,
          weaknessScore: t.wrong * 2 + avgTime / 30,
          reason:
            t.wrong > 0 && avgTime > 30
              ? "Galat bhi kar rahe ho aur time bhi zyada lag raha hai"
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
      data: {
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
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getPerformanceAnalysis = async (req, res) => {
  try {
    const { performanceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(performanceId)) {
      return res.status(400).json({ success: false, message: "Invalid Performance ID" });
    }

    const performance = await Performance.findOne({
      _id: performanceId,
      userId: req.user?._id,
    }).populate({
      path: "attemptedQuestions.questionId",
      model: RowQuestion,
    });

    if (!performance) {
      return res.status(404).json({ success: false, message: "Performance nahi mila." });
    }

    const blueprint = await Blueprint.findOne({
      blueprintName: performance.blueprintName,
      examName: performance.examName,
    });

    if (!blueprint) {
      return res.status(404).json({ success: false, message: "Blueprint nahi mila." });
    }

    const totalQuestions = blueprint.totalQuestions;
    const correct = performance.correctCount;
    const wrong = performance.wrongCount;
    const unattempted = performance.unattemptedCount;
    const totalScore = performance.totalScore;

    const accuracy = totalQuestions === 0 ? 0 : Number(((correct / totalQuestions) * 100).toFixed(2));

    let totalTimeTaken = 0;
    for (const aq of performance.attemptedQuestions) {
      totalTimeTaken += aq.timeTakenInSeconds ?? 0;
    }

    const averageTimePerQuestion =
      totalQuestions === 0 ? 0 : Number((totalTimeTaken / totalQuestions).toFixed(2));

    const marksLostToNegative = Number((wrong * (blueprint.negativeMarking || 0)).toFixed(2));
    const maxPossibleScore = totalQuestions * blueprint.marksPerQuestion;
    const scoreIfLeftBlankInsteadOfWrong = Number((correct * blueprint.marksPerQuestion).toFixed(2));

    const questionIds = performance.attemptedQuestions
      .map((aq) => (aq.questionId ? aq.questionId._id?.toString() || aq.questionId.toString() : null))
      .filter(Boolean);

    const batchTimeMap = await getBatchAverageTimePerQuestion(performance.examName, questionIds);

    const questionBreakdown = performance.attemptedQuestions.map((aq) => {
      const q = aq.questionId;
      const qId = q ? (q._id ? q._id.toString() : q.toString()) : null;
      const batchTime = qId ? batchTimeMap[qId] : null;
      return {
        questionId: q ? q._id : aq.questionId,
        question: q ? q.question : null,
        options: q
          ? { option1: q.option1, option2: q.option2, option3: q.option3, option4: q.option4 }
          : null,
        correctOption: q ? q.correctOption : null,
        userAnswer: aq.userAnswer,
        isCorrect: aq.isCorrect,
        answerExplain: q ? q.answerExplain : null,
        answerExplainWithPhoto: q ? q.answerExplainWithPhoto : null,
        askedIn: q ? q.askedIn : null,
        topicName: q ? q.topicName : null,
        subjectName: q ? q.subjectName : null,
        timeTakenInSeconds: aq.timeTakenInSeconds,
        batchAverageTimeSeconds: batchTime?.averageTimeSeconds ?? null,
        batchTimeSampleSize: batchTime?.sampleSize ?? 0,
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
        marksPerQuestion: blueprint.marksPerQuestion,
        negativeMarking: blueprint.negativeMarking,
        marksLostToNegative,
        maxPossibleScore,
        scoreIfLeftBlankInsteadOfWrong,
      },
      questionBreakdown,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSubjectAnalysis = async (req, res) => {
  try {
    let { userId, examName, subjectName } = req.params;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "User auth token missing ya invalid hai!" });
    }
    userId = req.user._id;

    const last3Tests = await Performance.find({ userId, examName }).sort({ createdAt: -1 }).limit(3);

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

        graphData.push({ performanceId: test._id, date: test.createdAt, accuracy: subData.accuracy });
      }
    }

    graphData.reverse();

    const averageAccuracy = subjectFoundCount === 0 ? 0 : Number((totalAccuracy / subjectFoundCount).toFixed(2));
    const averageTimePerQuestion =
      subjectFoundCount === 0 ? 0 : Number((totalTime / subjectFoundCount).toFixed(2));

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
          topicGroups[topicName] = { correct: 0, wrong: 0, unattempted: 0, total: 0, totalTime: 0, timedCount: 0 };
        }

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
      const efficiency = total === 0 ? 0 : Number(((correct / total) * 100).toFixed(2));
      const avgTime = timedCount === 0 ? 0 : Number((totalTime / timedCount).toFixed(2));

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
      data: { subjectName, averageAccuracy, averageTimePerQuestion, totalTestsConsidered: subjectFoundCount, graphData, topicList, weakTopics },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Subject analysis fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};

export const getTopicAnalysis = async (req, res) => {
  try {
    let { userId, examName, subjectName, topicName } = req.params;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "User auth token missing ya invalid hai!" });
    }
    userId = req.user._id;

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
    }).select("_id question option1 option2 option3 option4 correctOption answerExplain answerExplainWithPhoto askedIn topicName subjectName");

    const questionMap = {};
    for (const doc of questionDocs) {
      questionMap[doc._id.toString()] = doc;
    }

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
          options: { option1: qDoc.option1, option2: qDoc.option2, option3: qDoc.option3, option4: qDoc.option4 },
          correctOption: qDoc.correctOption,
          userAnswer: aq.userAnswer,
          answerExplain: qDoc.answerExplain,
          answerExplainWithPhoto: qDoc.answerExplainWithPhoto ?? null,
          askedIn: qDoc.askedIn ?? null,
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

    const batchTopicTime = await getBatchAverageTimeForTopic(examName, subjectName, topicName);

    const distinctQuestionIds = Object.keys(questionMap);
    const batchTimeMap = await getBatchAverageTimePerQuestion(examName, distinctQuestionIds);

    const attachBatchTime = (entry) => ({
      ...entry,
      batchAverageTimeSeconds: batchTimeMap[entry.questionId.toString()]?.averageTimeSeconds ?? null,
      batchTimeSampleSize: batchTimeMap[entry.questionId.toString()]?.sampleSize ?? 0,
    });

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
          batchAverageTimeSeconds: batchTopicTime.averageTimeSeconds,
          batchTimeSampleSize: batchTopicTime.sampleSize,
        },
        goodAt: goodAtQuestions.map(attachBatchTime),
        wrong: wrongQuestions.map(attachBatchTime),
        unattempted: unattemptedQuestions.map(attachBatchTime),
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

export const getUserMockTests = async (req, res) => {
  try {
    const { examName } = req.params;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "Login zaroori hai!" });
    }
    const userId = req.user._id;

    const tests = await Performance.find({ userId, examName })
      .select("_id blueprintName examName totalScore correctCount wrongCount unattemptedCount createdAt")
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
