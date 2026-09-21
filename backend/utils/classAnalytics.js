import mongoose from "mongoose";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import CouponAccess from "../models/CouponAccess.js";
import Performance from "../models/Performance.js";
import CustomTestAttempt from "../models/CustomTestAttempt.js";
import CustomTest from "../models/CustomTest.js";
import PreviousYearAttempt from "../models/PreviousYearAttempt.js";
import PreviousYearTest from "../models/PreviousYearTest.js";
import { Question as RowQuestion } from "../models/rowQuestionSchema.js";
import { ciExact, subjectKey, sameSubject } from "./subjectName.js";

const TOPIC_TIME_MIN_SAMPLE = 5;
const QUESTION_TIME_MIN_SAMPLE = 3;

export const getAllowedSubjectsForTeacher = async (teacher) => {
  if (teacher.role === "main") return null;
  const records = await CouponAccess.find({
    coupon: teacher.activeCoupon,
    subTeacher: teacher._id,
  }).select("subject");
  return records.map((r) => r.subject);
};

const buildEmbeddedQuestionMap = (testDocs, { fullData = false } = {}) => {
  const map = new Map();
  for (const doc of testDocs) {
    for (const subj of doc.subjects || []) {
      for (const q of subj.questions || []) {
        const meta = {
          subjectName: q.subjectName || subj.subjectName,
          topicName: q.topicName || "General",
        };
        if (fullData) {
          meta.question = q.question;
          meta.option1 = q.option1;
          meta.option2 = q.option2;
          meta.option3 = q.option3;
          meta.option4 = q.option4;
          meta.correctOption = q.correctOption;
          meta.testName = doc.testName;
        }
        map.set(`${doc._id.toString()}::${q._id.toString()}`, meta);
      }
    }
  }
  return map;
};

export const resolveFilteredStudentIds = async (
  teacher,
  { filter = "all", minPercentile, maxPercentile }
) => {
  if (!teacher.activeCoupon) {
    const err = new Error("Pehle apna active group/coupon select karein.");
    err.statusCode = 400;
    throw err;
  }

  const coupon = await Coupon.findById(teacher.activeCoupon).select("exam name");
  if (!coupon) {
    const err = new Error("Active coupon nahi mila.");
    err.statusCode = 404;
    throw err;
  }

  const batchStudents = await User.find({ activeCoupon: teacher.activeCoupon }).select("_id name");
  const totalBatchStudents = batchStudents.length;

  if (totalBatchStudents === 0) {
    return {
      studentIds: [],
      totalBatchStudents: 0,
      totalWithData: 0,
      selectedCount: 0,
      examName: coupon.exam,
      couponName: coupon.name,
    };
  }

  if (filter === "all") {
    return {
      studentIds: batchStudents.map((s) => s._id),
      totalBatchStudents,
      totalWithData: totalBatchStudents,
      selectedCount: totalBatchStudents,
      examName: coupon.exam,
      couponName: coupon.name,
    };
  }

  const studentObjIds = batchStudents.map((s) => s._id);
  const groupStage = {
    $group: {
      _id: "$userId",
      totalCorrect: { $sum: "$correctCount" },
      totalWrong: { $sum: "$wrongCount" },
      totalUnattempted: { $sum: "$unattemptedCount" },
    },
  };

  const [mockAgg, customAgg, pyqAgg] = await Promise.all([
    Performance.aggregate([{ $match: { userId: { $in: studentObjIds }, examName: coupon.exam } }, groupStage]),
    CustomTestAttempt.aggregate([{ $match: { userId: { $in: studentObjIds }, examName: coupon.exam } }, groupStage]),
    PreviousYearAttempt.aggregate([{ $match: { userId: { $in: studentObjIds }, examName: coupon.exam } }, groupStage]),
  ]);

  const combined = new Map();
  for (const arr of [mockAgg, customAgg, pyqAgg]) {
    for (const row of arr) {
      const key = row._id.toString();
      const prev = combined.get(key) || { correct: 0, wrong: 0, unattempted: 0 };
      prev.correct += row.totalCorrect || 0;
      prev.wrong += row.totalWrong || 0;
      prev.unattempted += row.totalUnattempted || 0;
      combined.set(key, prev);
    }
  }

  const rankedList = Array.from(combined.entries())
    .map(([studentId, v]) => {
      const total = v.correct + v.wrong + v.unattempted;
      return { studentId, accuracy: total > 0 ? (v.correct / total) * 100 : 0 };
    })
    .sort((a, b) => b.accuracy - a.accuracy);

  const n = rankedList.length;
  let selected;

  if (filter === "top25") {
    const cutoff = Math.max(1, Math.ceil(n * 0.25));
    selected = rankedList.slice(0, cutoff);
  } else if (filter === "bottom25") {
    const cutoff = Math.max(1, Math.ceil(n * 0.25));
    selected = rankedList.slice(-cutoff);
  } else if (filter === "custom") {
    const min = Math.max(0, Math.min(100, Number(minPercentile) || 0));
    const max = Math.max(0, Math.min(100, Number(maxPercentile) || 100));
    if (min >= max) {
      const err = new Error("minPercentile, maxPercentile se kam hona chahiye.");
      err.statusCode = 400;
      throw err;
    }
    const startIdx = Math.floor((min / 100) * n);
    const endIdx = Math.ceil((max / 100) * n);
    selected = rankedList.slice(startIdx, endIdx);
  } else {
    const err = new Error("filter 'all', 'top25', 'bottom25' ya 'custom' hona chahiye.");
    err.statusCode = 400;
    throw err;
  }

  return {
    studentIds: selected.map((s) => s.studentId),
    totalBatchStudents,
    totalWithData: n,
    selectedCount: selected.length,
    examName: coupon.exam,
    couponName: coupon.name,
  };
};

export const getTestTypeComparison = async (studentIds, examName) => {
  if (studentIds.length === 0) return [];

  const sumStage = [
    { $match: { userId: { $in: studentIds }, examName } },
    {
      $group: {
        _id: null,
        correct: { $sum: "$correctCount" },
        wrong: { $sum: "$wrongCount" },
        unattempted: { $sum: "$unattemptedCount" },
        attempts: { $sum: 1 },
      },
    },
  ];

  const [[mock] = [], [custom] = [], [pyq] = []] = await Promise.all([
    Performance.aggregate(sumStage),
    CustomTestAttempt.aggregate(sumStage),
    PreviousYearAttempt.aggregate(sumStage),
  ]);

  const toRow = (label, row) => {
    if (!row || row.attempts === 0) return { testType: label, totalAttempts: 0, accuracy: null };
    const total = row.correct + row.wrong + row.unattempted;
    return {
      testType: label,
      totalAttempts: row.attempts,
      accuracy: total === 0 ? 0 : Number(((row.correct / total) * 100).toFixed(2)),
    };
  };

  return [
    toRow("Mock Test", mock),
    toRow("Previous Year Papers", pyq),
    toRow("Custom Test", custom),
  ];
};

export const getTopicWiseBreakdown = async (studentIds, examName, allowedSubjects) => {
  if (Array.isArray(studentIds) && studentIds.length === 0) return [];

  const baseMatch = Array.isArray(studentIds) ? { userId: { $in: studentIds }, examName } : { examName };

  const topicGroups = new Map();

  const addToGroup = (subjectName, topicName, isCorrect, timeSeconds, sourceKey) => {
    if (Array.isArray(allowedSubjects) && !allowedSubjects.some((a) => sameSubject(a, subjectName))) return;
    const key = `${subjectKey(subjectName)}::${subjectKey(topicName)}`;
    if (!topicGroups.has(key)) {
      topicGroups.set(key, {
        subjectName,
        topicName,
        total: 0,
        wrong: 0,
        bySource: { mock: 0, pyq: 0, customTest: 0 },
        totalTime: 0,
        timedCount: 0,
      });
    }
    const g = topicGroups.get(key);
    g.total++;
    if (isCorrect === false) {
      g.wrong++;
      g.bySource[sourceKey]++;
    }
    if (typeof timeSeconds === "number" && timeSeconds >= 0) {
      g.totalTime += timeSeconds;
      g.timedCount++;
    }
  };

  const mockPipeline = [
    { $match: baseMatch },
    { $unwind: "$attemptedQuestions" },
    { $match: { "attemptedQuestions.isCorrect": { $ne: null } } },
    {
      $lookup: {
        from: RowQuestion.collection.name,
        localField: "attemptedQuestions.questionId",
        foreignField: "_id",
        as: "questionDoc",
      },
    },
    { $unwind: "$questionDoc" },
    {
      $project: {
        _id: 0,
        subjectName: "$questionDoc.subjectName",
        topicName: "$questionDoc.topicName",
        isCorrect: "$attemptedQuestions.isCorrect",
        timeTakenInSeconds: "$attemptedQuestions.timeTakenInSeconds",
      },
    },
  ];
  const mockRows = await Performance.aggregate(mockPipeline);
  mockRows.forEach((r) => addToGroup(r.subjectName, r.topicName, r.isCorrect, r.timeTakenInSeconds, "mock"));

  const pyqAttempts = await PreviousYearAttempt.find(baseMatch).select("testId attemptedQuestions");
  if (pyqAttempts.length > 0) {
    const pyqTestIds = [...new Set(pyqAttempts.map((a) => a.testId.toString()))];
    const pyqTests = await PreviousYearTest.find({ _id: { $in: pyqTestIds } }).select("subjects");
    const pyqMetaMap = buildEmbeddedQuestionMap(pyqTests);
    for (const attempt of pyqAttempts) {
      for (const aq of attempt.attemptedQuestions) {
        if (aq.isCorrect === null || aq.isCorrect === undefined) continue;
        const meta = pyqMetaMap.get(`${attempt.testId}::${aq.questionId}`);
        if (!meta) continue;
        addToGroup(meta.subjectName, meta.topicName, aq.isCorrect, aq.timeTakenInSeconds, "pyq");
      }
    }
  }

  const customAttempts = await CustomTestAttempt.find(baseMatch).select("testId attemptedQuestions");
  if (customAttempts.length > 0) {
    const customTestIds = [...new Set(customAttempts.map((a) => a.testId.toString()))];
    const customTests = await CustomTest.find({ _id: { $in: customTestIds } }).select("subjects");
    const customMetaMap = buildEmbeddedQuestionMap(customTests);
    for (const attempt of customAttempts) {
      for (const aq of attempt.attemptedQuestions) {
        if (aq.isCorrect === null || aq.isCorrect === undefined) continue;
        const meta = customMetaMap.get(`${attempt.testId}::${aq.questionId}`);
        if (!meta) continue;
        addToGroup(meta.subjectName, meta.topicName, aq.isCorrect, aq.timeTakenInSeconds, "customTest");
      }
    }
  }

  return Array.from(topicGroups.values())
    .map((g) => ({
      subjectName: g.subjectName,
      topicName: g.topicName,
      totalAttempts: g.total,
      wrongCount: g.wrong,
      wrongPercentage: g.total === 0 ? 0 : Number(((g.wrong / g.total) * 100).toFixed(2)),
      bySource: g.bySource,
      averageTimeSeconds: g.timedCount >= TOPIC_TIME_MIN_SAMPLE ? Math.round(g.totalTime / g.timedCount) : null,
      timeSampleSize: g.timedCount,
    }))
    .sort((a, b) => b.wrongPercentage - a.wrongPercentage || b.totalAttempts - a.totalAttempts);
};

export const getQuestionWiseBreakdown = async (studentIds, examName, subjectName, topicName) => {
  if (Array.isArray(studentIds) && studentIds.length === 0) return [];

  const baseMatch = Array.isArray(studentIds) ? { userId: { $in: studentIds }, examName } : { examName };
  const results = [];

  const mockPipeline = [
    { $match: baseMatch },
    { $unwind: "$attemptedQuestions" },
    { $match: { "attemptedQuestions.isCorrect": { $ne: null } } },
    {
      $lookup: {
        from: RowQuestion.collection.name,
        localField: "attemptedQuestions.questionId",
        foreignField: "_id",
        as: "questionDoc",
      },
    },
    { $unwind: "$questionDoc" },
    { $match: { "questionDoc.subjectName": ciExact(subjectName), "questionDoc.topicName": ciExact(topicName) } },
    {
      $group: {
        _id: "$attemptedQuestions.questionId",
        question: { $first: "$questionDoc.question" },
        option1: { $first: "$questionDoc.option1" },
        option2: { $first: "$questionDoc.option2" },
        option3: { $first: "$questionDoc.option3" },
        option4: { $first: "$questionDoc.option4" },
        correctOption: { $first: "$questionDoc.correctOption" },
        totalAttempts: { $sum: 1 },
        wrongCount: { $sum: { $cond: [{ $eq: ["$attemptedQuestions.isCorrect", false] }, 1, 0] } },
        opt1Picked: { $sum: { $cond: [{ $eq: ["$attemptedQuestions.userAnswer", "1"] }, 1, 0] } },
        opt2Picked: { $sum: { $cond: [{ $eq: ["$attemptedQuestions.userAnswer", "2"] }, 1, 0] } },
        opt3Picked: { $sum: { $cond: [{ $eq: ["$attemptedQuestions.userAnswer", "3"] }, 1, 0] } },
        opt4Picked: { $sum: { $cond: [{ $eq: ["$attemptedQuestions.userAnswer", "4"] }, 1, 0] } },
        totalTime: { $sum: { $cond: [{ $ne: ["$attemptedQuestions.timeTakenInSeconds", null] }, "$attemptedQuestions.timeTakenInSeconds", 0] } },
        timedCount: { $sum: { $cond: [{ $ne: ["$attemptedQuestions.timeTakenInSeconds", null] }, 1, 0] } },
      },
    },
  ];
  const mockRows = await Performance.aggregate(mockPipeline);
  mockRows.forEach((r) => results.push(formatQuestionRow(r, "Mock Test", null)));

  const pyqAttempts = await PreviousYearAttempt.find(baseMatch).select("testId attemptedQuestions");
  if (pyqAttempts.length > 0) {
    const pyqTestIds = [...new Set(pyqAttempts.map((a) => a.testId.toString()))];
    const pyqTests = await PreviousYearTest.find({ _id: { $in: pyqTestIds } }).select("testName year subjects");
    const pyqFullMap = buildEmbeddedQuestionMap(pyqTests, { fullData: true });
    const pyqRows = aggregateEmbeddedAttempts(pyqAttempts, pyqFullMap, subjectName, topicName);
    pyqRows.forEach((r) => results.push(formatQuestionRow(r, "Previous Year Paper", r.testName)));
  }

  const customAttempts = await CustomTestAttempt.find(baseMatch).select("testId attemptedQuestions");
  if (customAttempts.length > 0) {
    const customTestIds = [...new Set(customAttempts.map((a) => a.testId.toString()))];
    const customTests = await CustomTest.find({ _id: { $in: customTestIds } }).select("testName subjects");
    const customFullMap = buildEmbeddedQuestionMap(customTests, { fullData: true });
    const customRows = aggregateEmbeddedAttempts(customAttempts, customFullMap, subjectName, topicName);
    customRows.forEach((r) => results.push(formatQuestionRow(r, "Custom Test", r.testName)));
  }

  return results.sort((a, b) => b.wrongPercentage - a.wrongPercentage);
};

function aggregateEmbeddedAttempts(attempts, fullMetaMap, subjectName, topicName) {
  const groups = new Map();

  for (const attempt of attempts) {
    for (const aq of attempt.attemptedQuestions) {
      if (aq.isCorrect === null || aq.isCorrect === undefined) continue;
      const mapKey = `${attempt.testId}::${aq.questionId}`;
      const meta = fullMetaMap.get(mapKey);
      if (!meta) continue;
      if (!sameSubject(meta.subjectName, subjectName) || !sameSubject(meta.topicName, topicName)) continue;

      if (!groups.has(mapKey)) {
        groups.set(mapKey, {
          questionId: aq.questionId,
          question: meta.question,
          option1: meta.option1,
          option2: meta.option2,
          option3: meta.option3,
          option4: meta.option4,
          correctOption: meta.correctOption,
          testName: meta.testName,
          totalAttempts: 0,
          wrongCount: 0,
          opt1Picked: 0,
          opt2Picked: 0,
          opt3Picked: 0,
          opt4Picked: 0,
          totalTime: 0,
          timedCount: 0,
        });
      }
      const g = groups.get(mapKey);
      g.totalAttempts++;
      if (aq.isCorrect === false) g.wrongCount++;
      if (aq.userAnswer === "1") g.opt1Picked++;
      else if (aq.userAnswer === "2") g.opt2Picked++;
      else if (aq.userAnswer === "3") g.opt3Picked++;
      else if (aq.userAnswer === "4") g.opt4Picked++;
      if (typeof aq.timeTakenInSeconds === "number" && aq.timeTakenInSeconds >= 0) {
        g.totalTime += aq.timeTakenInSeconds;
        g.timedCount++;
      }
    }
  }

  return Array.from(groups.values());
}

function formatQuestionRow(r, sourceType, sourceName) {
  const totalAttempts = r.totalAttempts;
  const timedCount = r.timedCount || 0;
  return {
    questionId: r._id || r.questionId,
    question: r.question,
    options: { option1: r.option1, option2: r.option2, option3: r.option3, option4: r.option4 },
    correctOption: r.correctOption,
    totalAttempts,
    wrongCount: r.wrongCount,
    wrongPercentage: totalAttempts === 0 ? 0 : Number(((r.wrongCount / totalAttempts) * 100).toFixed(2)),
    optionPickPercentage: {
      option1: totalAttempts === 0 ? 0 : Number(((r.opt1Picked / totalAttempts) * 100).toFixed(2)),
      option2: totalAttempts === 0 ? 0 : Number(((r.opt2Picked / totalAttempts) * 100).toFixed(2)),
      option3: totalAttempts === 0 ? 0 : Number(((r.opt3Picked / totalAttempts) * 100).toFixed(2)),
      option4: totalAttempts === 0 ? 0 : Number(((r.opt4Picked / totalAttempts) * 100).toFixed(2)),
    },
    averageTimeSeconds: timedCount >= QUESTION_TIME_MIN_SAMPLE ? Math.round(r.totalTime / timedCount) : null,
    timeSampleSize: timedCount,
    sourceType,
    sourceName,
  };
}

export const getBatchAverageTimeForTopic = async (examName, subjectName, topicName) => {
  let totalTime = 0;
  let timedCount = 0;

  const mockRows = await Performance.aggregate([
    { $match: { examName } },
    { $unwind: "$attemptedQuestions" },
    { $match: { "attemptedQuestions.timeTakenInSeconds": { $ne: null } } },
    {
      $lookup: {
        from: RowQuestion.collection.name,
        localField: "attemptedQuestions.questionId",
        foreignField: "_id",
        as: "questionDoc",
      },
    },
    { $unwind: "$questionDoc" },
    { $match: { "questionDoc.subjectName": ciExact(subjectName), "questionDoc.topicName": ciExact(topicName) } },
    {
      $group: {
        _id: null,
        totalTime: { $sum: "$attemptedQuestions.timeTakenInSeconds" },
        timedCount: { $sum: 1 },
      },
    },
  ]);
  if (mockRows[0]) {
    totalTime += mockRows[0].totalTime;
    timedCount += mockRows[0].timedCount;
  }

  const pyqAttempts = await PreviousYearAttempt.find({ examName }).select("testId attemptedQuestions");
  if (pyqAttempts.length > 0) {
    const pyqTestIds = [...new Set(pyqAttempts.map((a) => a.testId.toString()))];
    const pyqTests = await PreviousYearTest.find({ _id: { $in: pyqTestIds } }).select("subjects");
    const pyqMetaMap = buildEmbeddedQuestionMap(pyqTests);
    for (const attempt of pyqAttempts) {
      for (const aq of attempt.attemptedQuestions) {
        if (aq.timeTakenInSeconds == null) continue;
        const meta = pyqMetaMap.get(`${attempt.testId}::${aq.questionId}`);
        if (!meta) continue;
        if (!sameSubject(meta.subjectName, subjectName) || !sameSubject(meta.topicName, topicName)) continue;
        totalTime += aq.timeTakenInSeconds;
        timedCount++;
      }
    }
  }

  const customAttempts = await CustomTestAttempt.find({ examName }).select("testId attemptedQuestions");
  if (customAttempts.length > 0) {
    const customTestIds = [...new Set(customAttempts.map((a) => a.testId.toString()))];
    const customTests = await CustomTest.find({ _id: { $in: customTestIds } }).select("subjects");
    const customMetaMap = buildEmbeddedQuestionMap(customTests);
    for (const attempt of customAttempts) {
      for (const aq of attempt.attemptedQuestions) {
        if (aq.timeTakenInSeconds == null) continue;
        const meta = customMetaMap.get(`${attempt.testId}::${aq.questionId}`);
        if (!meta) continue;
        if (!sameSubject(meta.subjectName, subjectName) || !sameSubject(meta.topicName, topicName)) continue;
        totalTime += aq.timeTakenInSeconds;
        timedCount++;
      }
    }
  }

  if (timedCount < TOPIC_TIME_MIN_SAMPLE) return { averageTimeSeconds: null, sampleSize: timedCount };
  return { averageTimeSeconds: Math.round(totalTime / timedCount), sampleSize: timedCount };
};

export const getBatchAverageTimePerQuestion = async (examName, questionIds) => {
  if (!questionIds || questionIds.length === 0) return {};
  const objectIds = questionIds
    .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  if (objectIds.length === 0) return {};

  const rows = await Performance.aggregate([
    { $match: { examName } },
    { $unwind: "$attemptedQuestions" },
    {
      $match: {
        "attemptedQuestions.questionId": { $in: objectIds },
        "attemptedQuestions.timeTakenInSeconds": { $ne: null },
      },
    },
    {
      $group: {
        _id: "$attemptedQuestions.questionId",
        totalTime: { $sum: "$attemptedQuestions.timeTakenInSeconds" },
        timedCount: { $sum: 1 },
      },
    },
  ]);

  const map = {};
  for (const r of rows) {
    const id = r._id.toString();
    map[id] =
      r.timedCount >= QUESTION_TIME_MIN_SAMPLE
        ? { averageTimeSeconds: Math.round(r.totalTime / r.timedCount), sampleSize: r.timedCount }
        : { averageTimeSeconds: null, sampleSize: r.timedCount };
  }
  return map;
};

export const getBatchAverageTimePerEmbeddedQuestion = async (AttemptModel, testId, questionIds) => {
  if (!questionIds || questionIds.length === 0) return {};
  const idSet = new Set(questionIds.map(String));
  const attempts = await AttemptModel.find({ testId }).select("attemptedQuestions");
  const acc = {};

  for (const attempt of attempts) {
    for (const aq of attempt.attemptedQuestions) {
      if (aq.timeTakenInSeconds == null) continue;
      const qId = aq.questionId.toString();
      if (!idSet.has(qId)) continue;
      if (!acc[qId]) acc[qId] = { totalTime: 0, timedCount: 0 };
      acc[qId].totalTime += aq.timeTakenInSeconds;
      acc[qId].timedCount += 1;
    }
  }

  const map = {};
  for (const [qId, v] of Object.entries(acc)) {
    map[qId] =
      v.timedCount >= QUESTION_TIME_MIN_SAMPLE
        ? { averageTimeSeconds: Math.round(v.totalTime / v.timedCount), sampleSize: v.timedCount }
        : { averageTimeSeconds: null, sampleSize: v.timedCount };
  }
  return map;
};

export const getTopMisconceptions = async (studentIds, examName, allowedSubjects, limit = 6) => {
  if (Array.isArray(studentIds) && studentIds.length === 0) return [];
  const baseMatch = Array.isArray(studentIds) ? { userId: { $in: studentIds }, examName } : { examName };

  const rows = await Performance.aggregate([
    { $match: baseMatch },
    { $unwind: "$attemptedQuestions" },
    { $match: { "attemptedQuestions.isCorrect": { $ne: null } } },
    {
      $lookup: {
        from: RowQuestion.collection.name,
        localField: "attemptedQuestions.questionId",
        foreignField: "_id",
        as: "questionDoc",
      },
    },
    { $unwind: "$questionDoc" },
    {
      $group: {
        _id: "$attemptedQuestions.questionId",
        question: { $first: "$questionDoc.question" },
        subjectName: { $first: "$questionDoc.subjectName" },
        topicName: { $first: "$questionDoc.topicName" },
        option1: { $first: "$questionDoc.option1" },
        option2: { $first: "$questionDoc.option2" },
        option3: { $first: "$questionDoc.option3" },
        option4: { $first: "$questionDoc.option4" },
        correctOption: { $first: "$questionDoc.correctOption" },
        totalAttempts: { $sum: 1 },
        wrongCount: { $sum: { $cond: [{ $eq: ["$attemptedQuestions.isCorrect", false] }, 1, 0] } },
        opt1Picked: { $sum: { $cond: [{ $eq: ["$attemptedQuestions.userAnswer", "1"] }, 1, 0] } },
        opt2Picked: { $sum: { $cond: [{ $eq: ["$attemptedQuestions.userAnswer", "2"] }, 1, 0] } },
        opt3Picked: { $sum: { $cond: [{ $eq: ["$attemptedQuestions.userAnswer", "3"] }, 1, 0] } },
        opt4Picked: { $sum: { $cond: [{ $eq: ["$attemptedQuestions.userAnswer", "4"] }, 1, 0] } },
      },
    },
    { $match: { totalAttempts: { $gte: 8 } } },
  ]);

  const results = [];
  for (const r of rows) {
    if (Array.isArray(allowedSubjects) && !allowedSubjects.some((a) => sameSubject(a, r.subjectName))) continue;

    const wrongPercentage = r.totalAttempts === 0 ? 0 : (r.wrongCount / r.totalAttempts) * 100;
    if (wrongPercentage < 35) continue;

    const picks = [
      { option: 1, count: r.opt1Picked },
      { option: 2, count: r.opt2Picked },
      { option: 3, count: r.opt3Picked },
      { option: 4, count: r.opt4Picked },
    ].filter((p) => p.option !== r.correctOption);

    const dominant = picks.sort((a, b) => b.count - a.count)[0];
    const dominantPercentage = r.totalAttempts === 0 ? 0 : (dominant.count / r.totalAttempts) * 100;
    if (dominantPercentage < 25) continue;

    results.push({
      questionId: r._id,
      question: r.question,
      subjectName: r.subjectName,
      topicName: r.topicName,
      totalAttempts: r.totalAttempts,
      wrongPercentage: Number(wrongPercentage.toFixed(2)),
      dominantWrongOption: dominant.option,
      dominantWrongPercentage: Number(dominantPercentage.toFixed(2)),
      options: { option1: r.option1, option2: r.option2, option3: r.option3, option4: r.option4 },
      correctOption: r.correctOption,
    });
  }

  return results.sort((a, b) => b.dominantWrongPercentage - a.dominantWrongPercentage).slice(0, limit);
};
