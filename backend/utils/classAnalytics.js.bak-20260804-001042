// utils/classAnalytics.js
// Reusable aggregation helpers — teacher ke active-coupon ke students ka
// class-level topic/question analysis banane ke liye. Ek hi core logic,
// alag-alag percentile-filters (all/top25/bottom25/custom) ke liye reuse hota hai.
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import CouponAccess from "../models/CouponAccess.js";
import Performance from "../models/Performance.js";
import { Question as RowQuestion } from "../models/rowQuestionSchema.js";

// ─────────────────────────────────────────────
// Sub-teacher ke liye uske active-coupon mein authorized subjects.
// Main Teacher ke liye null (matlab koi restriction nahi — sab dekh sakta hai,
// jaisa spec point 5 mein hai: "Main Teacher hamesha sab kuch dekh sakta hai")
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
// Teacher ke active-coupon ke students ko percentile-filter ke hisaab se
// resolve karta hai. examName bhi coupon se hi derive hota hai (client se
// nahi leते, taaki galat exam ka data kabhi cross na ho — jaisa
// addTeacherQuestion.js mein bhi pattern hai).
// ─────────────────────────────────────────────
export const resolveFilteredStudentIds = async (teacher, { filter = "all", minPercentile, maxPercentile }) => {
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
      selectedCount: 0,
      examName: coupon.exam,
      couponName: coupon.name,
    };
  }

  // "Sabhi Students" — koi ranking zaroori nahi, poori batch use karo
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

  // ─────────────────────────────────────────────
  // Percentile filters (top25/bottom25/custom) ke liye ranking chahiye —
  // sirf unhi students ko rank karenge jinka is exam mein kam se kam ek
  // Performance doc hai. Bina data wale students ranking mein meaningless hain.
  // ─────────────────────────────────────────────
  const perfAgg = await Performance.aggregate([
    { $match: { userId: { $in: batchStudents.map((s) => s._id) }, examName: coupon.exam } },
    {
      $group: {
        _id: "$userId",
        totalCorrect: { $sum: "$correctCount" },
        totalWrong: { $sum: "$wrongCount" },
        totalUnattempted: { $sum: "$unattemptedCount" },
      },
    },
  ]);

  const rankedList = perfAgg
    .map((p) => {
      const total = p.totalCorrect + p.totalWrong + p.totalUnattempted;
      return {
        studentId: p._id,
        accuracy: total > 0 ? (p.totalCorrect / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.accuracy - a.accuracy); // best pehle (0 = top)

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
// CORE FUNCTION 1: Topic-wise wrong% breakdown, diye gaye studentIds ke liye.
// allowedSubjects === null matlab koi restriction nahi (Main Teacher).
// ─────────────────────────────────────────────
export const getTopicWiseBreakdown = async (studentIds, examName, allowedSubjects) => {
  if (studentIds.length === 0) return [];

  const pipeline = [
    { $match: { userId: { $in: studentIds }, examName } },
    { $unwind: "$attemptedQuestions" },
    { $match: { "attemptedQuestions.isCorrect": { $ne: null } } }, // unattempted skip
    {
      $lookup: {
        from: RowQuestion.collection.name,
        localField: "attemptedQuestions.questionId",
        foreignField: "_id",
        as: "questionDoc",
      },
    },
    { $unwind: "$questionDoc" },
  ];

  if (Array.isArray(allowedSubjects)) {
    pipeline.push({ $match: { "questionDoc.subjectName": { $in: allowedSubjects } } });
  }

  pipeline.push(
    {
      $group: {
        _id: { subjectName: "$questionDoc.subjectName", topicName: "$questionDoc.topicName" },
        totalAttempts: { $sum: 1 },
        wrongCount: {
          $sum: { $cond: [{ $eq: ["$attemptedQuestions.isCorrect", false] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        subjectName: "$_id.subjectName",
        topicName: "$_id.topicName",
        totalAttempts: 1,
        wrongCount: 1,
        wrongPercentage: {
          $round: [{ $multiply: [{ $divide: ["$wrongCount", "$totalAttempts"] }, 100] }, 2],
        },
      },
    },
    { $sort: { wrongPercentage: -1, totalAttempts: -1 } } // sabse zyada galti wala topic upar
  );

  return await Performance.aggregate(pipeline);
};

// ─────────────────────────────────────────────
// CORE FUNCTION 2: Ek topic ke andar question-level breakdown, wrong-option
// distribution ke saath — common misconception pakadne ke liye ("kitne %
// students ne kaunsa galat option choose kiya").
// ─────────────────────────────────────────────
export const getQuestionWiseBreakdown = async (studentIds, examName, subjectName, topicName) => {
  if (studentIds.length === 0) return [];

  const pipeline = [
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
    { $match: { "questionDoc.subjectName": subjectName, "questionDoc.topicName": topicName } },
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
        wrongCount: {
          $sum: { $cond: [{ $eq: ["$attemptedQuestions.isCorrect", false] }, 1, 0] },
        },
        opt1Picked: { $sum: { $cond: [{ $eq: ["$attemptedQuestions.userAnswer", "1"] }, 1, 0] } },
        opt2Picked: { $sum: { $cond: [{ $eq: ["$attemptedQuestions.userAnswer", "2"] }, 1, 0] } },
        opt3Picked: { $sum: { $cond: [{ $eq: ["$attemptedQuestions.userAnswer", "3"] }, 1, 0] } },
        opt4Picked: { $sum: { $cond: [{ $eq: ["$attemptedQuestions.userAnswer", "4"] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        questionId: "$_id",
        question: 1,
        options: { option1: "$option1", option2: "$option2", option3: "$option3", option4: "$option4" },
        correctOption: 1,
        totalAttempts: 1,
        wrongCount: 1,
        wrongPercentage: {
          $round: [{ $multiply: [{ $divide: ["$wrongCount", "$totalAttempts"] }, 100] }, 2],
        },
        optionPickPercentage: {
          option1: { $round: [{ $multiply: [{ $divide: ["$opt1Picked", "$totalAttempts"] }, 100] }, 2] },
          option2: { $round: [{ $multiply: [{ $divide: ["$opt2Picked", "$totalAttempts"] }, 100] }, 2] },
          option3: { $round: [{ $multiply: [{ $divide: ["$opt3Picked", "$totalAttempts"] }, 100] }, 2] },
          option4: { $round: [{ $multiply: [{ $divide: ["$opt4Picked", "$totalAttempts"] }, 100] }, 2] },
        },
      },
    },
    { $sort: { wrongPercentage: -1 } },
  ];

  return await Performance.aggregate(pipeline);
};