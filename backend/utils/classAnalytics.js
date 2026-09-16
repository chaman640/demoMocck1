// backend/utils/classAnalytics.js
//
// 🆕 REDESIGN — pehle ye sirf Mock Test (Performance model) ka data dekhta
// tha. Teacher khud jo Previous Year Papers aur Custom Tests banata hai,
// unke attempts (PreviousYearAttempt, CustomTestAttempt) is analysis mein
// KABHI shaamil hi nahi hote the — matlab teacher ko apne khud ke banaye
// content ka koi feedback hi nahi milta tha.
//
// Ab teenon sources merge hote hain:
//   1. Mock Test        → Performance + rowQuestion pool
//   2. Previous Year    → PreviousYearAttempt + PreviousYearTest (embedded questions)
//   3. Custom Test      → CustomTestAttempt + CustomTest (embedded questions)
//
// Reusable aggregation helpers — teacher ke active-coupon ke students ka
// class-level topic/question analysis banane ke liye.
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

// ─────────────────────────────────────────────
// Sub-teacher ke liye uske active-coupon mein authorized subjects.
// Main Teacher ke liye null (koi restriction nahi).
// ─────────────────────────────────────────────
export const getAllowedSubjectsForTeacher = async (teacher) => {
  if (teacher.role === "main") return null;
  const records = await CouponAccess.find({
    coupon: teacher.activeCoupon,
    subTeacher: teacher._id,
  }).select("subject");
  return records.map((r) => r.subject);
};

// ─────────────────────────────────────────────
// 🆕 Helper: embedded question schema wale test models (CustomTest,
// PreviousYearTest) dono ka structure same hai — subjects[].questions[]
// jisme har question ka apna _id, topicName, subjectName hai. Ek hi
// helper dono ke liye reuse hota hai.
// Returns Map: "testId::questionId" → { subjectName, topicName, ...fullData }
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Teacher ke active-coupon ke students ko percentile-filter ke hisaab se
// resolve karta hai. examName bhi coupon se hi derive hota hai.
// 🆕 Ranking ab sirf Mock Test se nahi — Mock + Custom Test + PYQ teenon
// ke correct/wrong/unattempted jod ke banti hai, taaki "top/bottom 25%"
// poore performance ko reflect kare, sirf mock test ko nahi.
// ─────────────────────────────────────────────
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

  // 🆕 Teenon sources se ranking data jod rahe hain
  const [mockAgg, customAgg, pyqAgg] = await Promise.all([
    Performance.aggregate([{ $match: { userId: { $in: studentObjIds }, examName: coupon.exam } }, groupStage]),
    CustomTestAttempt.aggregate([{ $match: { userId: { $in: studentObjIds }, examName: coupon.exam } }, groupStage]),
    PreviousYearAttempt.aggregate([{ $match: { userId: { $in: studentObjIds }, examName: coupon.exam } }, groupStage]),
  ]);

  const combined = new Map(); // userId → { correct, wrong, unattempted }
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

// ─────────────────────────────────────────────
// 🆕 Test-Type Comparison — batch Mock/PYQ/Custom Test mein se kis type
// mein sabse zyada struggle kar rahi hai, ek nazar mein.
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// CORE 1: Topic-wise wrong% breakdown — 🆕 ab teenon sources se merge hota hai
// allowedSubjects === null matlab koi restriction nahi (Main Teacher).
// ─────────────────────────────────────────────
export const getTopicWiseBreakdown = async (studentIds, examName, allowedSubjects) => {
  if (studentIds.length === 0) return [];

  const topicGroups = new Map(); // "subject::topic" → { subjectName, topicName, total, wrong, bySource }

  const addToGroup = (subjectName, topicName, isCorrect, sourceKey) => {
    if (Array.isArray(allowedSubjects) && !allowedSubjects.some((a) => sameSubject(a, subjectName))) return;
    const key = `${subjectKey(subjectName)}::${subjectKey(topicName)}`;
    if (!topicGroups.has(key)) {
      topicGroups.set(key, {
        subjectName,
        topicName,
        total: 0,
        wrong: 0,
        bySource: { mock: 0, pyq: 0, customTest: 0 }, // sirf galat count, source-wise
      });
    }
    const g = topicGroups.get(key);
    g.total++;
    if (isCorrect === false) {
      g.wrong++;
      g.bySource[sourceKey]++;
    }
  };

  // ── Source 1: Mock Test (Performance → RowQuestion pool) ──
  const mockPipeline = [
    { $match: { userId: { $in: studentIds }, examName } },
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
      },
    },
  ];
  const mockRows = await Performance.aggregate(mockPipeline);
  mockRows.forEach((r) => addToGroup(r.subjectName, r.topicName, r.isCorrect, "mock"));

  // ── Source 2: Previous Year Papers (embedded questions) ──
  const pyqAttempts = await PreviousYearAttempt.find({ userId: { $in: studentIds }, examName }).select(
    "testId attemptedQuestions"
  );
  if (pyqAttempts.length > 0) {
    const pyqTestIds = [...new Set(pyqAttempts.map((a) => a.testId.toString()))];
    const pyqTests = await PreviousYearTest.find({ _id: { $in: pyqTestIds } }).select("subjects");
    const pyqMetaMap = buildEmbeddedQuestionMap(pyqTests);
    for (const attempt of pyqAttempts) {
      for (const aq of attempt.attemptedQuestions) {
        if (aq.isCorrect === null || aq.isCorrect === undefined) continue;
        const meta = pyqMetaMap.get(`${attempt.testId}::${aq.questionId}`);
        if (!meta) continue;
        addToGroup(meta.subjectName, meta.topicName, aq.isCorrect, "pyq");
      }
    }
  }

  // ── Source 3: Custom Tests (embedded questions) ──
  const customAttempts = await CustomTestAttempt.find({ userId: { $in: studentIds }, examName }).select(
    "testId attemptedQuestions"
  );
  if (customAttempts.length > 0) {
    const customTestIds = [...new Set(customAttempts.map((a) => a.testId.toString()))];
    const customTests = await CustomTest.find({ _id: { $in: customTestIds } }).select("subjects");
    const customMetaMap = buildEmbeddedQuestionMap(customTests);
    for (const attempt of customAttempts) {
      for (const aq of attempt.attemptedQuestions) {
        if (aq.isCorrect === null || aq.isCorrect === undefined) continue;
        const meta = customMetaMap.get(`${attempt.testId}::${aq.questionId}`);
        if (!meta) continue;
        addToGroup(meta.subjectName, meta.topicName, aq.isCorrect, "customTest");
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
      bySource: g.bySource, // 🆕 { mock, pyq, customTest } — kis test-type se zyada galtiyan aa rahi hain
    }))
    .sort((a, b) => b.wrongPercentage - a.wrongPercentage || b.totalAttempts - a.totalAttempts);
};

// ─────────────────────────────────────────────
// CORE 2: Ek topic ke andar question-level breakdown + wrong-option
// distribution — 🆕 teenon sources se, har question par uska source label
// (Mock Test / Previous Year Paper naam / Custom Test naam) ke saath.
// ─────────────────────────────────────────────
export const getQuestionWiseBreakdown = async (studentIds, examName, subjectName, topicName) => {
  if (studentIds.length === 0) return [];

  const results = [];

  // ── Source 1: Mock Test ──
  const mockPipeline = [
    { $match: { userId: { $in: studentIds }, examName } },
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
      },
    },
  ];
  const mockRows = await Performance.aggregate(mockPipeline);
  mockRows.forEach((r) => results.push(formatQuestionRow(r, "Mock Test", null)));

  // ── Source 2: Previous Year Papers ──
  const pyqAttempts = await PreviousYearAttempt.find({ userId: { $in: studentIds }, examName }).select(
    "testId attemptedQuestions"
  );
  if (pyqAttempts.length > 0) {
    const pyqTestIds = [...new Set(pyqAttempts.map((a) => a.testId.toString()))];
    const pyqTests = await PreviousYearTest.find({ _id: { $in: pyqTestIds } }).select("testName year subjects");
    const pyqFullMap = buildEmbeddedQuestionMap(pyqTests, { fullData: true });
    const testNameMap = new Map(pyqTests.map((t) => [t._id.toString(), `${t.testName}${t.year ? ` (${t.year})` : ""}`]));
    const pyqRows = aggregateEmbeddedAttempts(pyqAttempts, pyqFullMap, subjectName, topicName);
    pyqRows.forEach((r) => results.push(formatQuestionRow(r, "Previous Year Paper", r.testName)));
  }

  // ── Source 3: Custom Tests ──
  const customAttempts = await CustomTestAttempt.find({ userId: { $in: studentIds }, examName }).select(
    "testId attemptedQuestions"
  );
  if (customAttempts.length > 0) {
    const customTestIds = [...new Set(customAttempts.map((a) => a.testId.toString()))];
    const customTests = await CustomTest.find({ _id: { $in: customTestIds } }).select("testName subjects");
    const customFullMap = buildEmbeddedQuestionMap(customTests, { fullData: true });
    const customRows = aggregateEmbeddedAttempts(customAttempts, customFullMap, subjectName, topicName);
    customRows.forEach((r) => results.push(formatQuestionRow(r, "Custom Test", r.testName)));
  }

  return results.sort((a, b) => b.wrongPercentage - a.wrongPercentage);
};

// ─────────────────────────────────────────────
// 🆕 Helper — CustomTestAttempt / PreviousYearAttempt (embedded question)
// attempts ko question-level counts mein group karta hai (JS mein, kyunki
// embedded nested-array par MongoDB aggregation lookup possible nahi hai).
// ─────────────────────────────────────────────
function aggregateEmbeddedAttempts(attempts, fullMetaMap, subjectName, topicName) {
  const groups = new Map(); // "testId::questionId" → counts

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
        });
      }
      const g = groups.get(mapKey);
      g.totalAttempts++;
      if (aq.isCorrect === false) g.wrongCount++;
      if (aq.userAnswer === "1") g.opt1Picked++;
      else if (aq.userAnswer === "2") g.opt2Picked++;
      else if (aq.userAnswer === "3") g.opt3Picked++;
      else if (aq.userAnswer === "4") g.opt4Picked++;
    }
  }

  return Array.from(groups.values());
}

// ─────────────────────────────────────────────
// 🆕 Helper — ek consistent shape mein question row banata hai, source
// label ke saath (frontend ko dikhane ke liye "Mock Test" / "PYQ 2023" / etc)
// ─────────────────────────────────────────────
function formatQuestionRow(r, sourceType, sourceName) {
  const totalAttempts = r.totalAttempts;
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
    sourceType, // "Mock Test" | "Previous Year Paper" | "Custom Test"
    sourceName, // e.g. "UPSC Prelims 2023 (2023)" — null for Mock Test
  };
}
