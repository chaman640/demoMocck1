// controllers/getTeacherDashboard.js
// Login/home ke liye summary dashboard. Main Teacher ko sab kuch dikhta
// hai (apne coupons ke across), Sub-Teacher ko sirf apna scoped view —
// authorized coupons + khud ka contribution.
import Teacher from "../models/Teacher.js";
import Coupon from "../models/Coupon.js";
import CouponAccess from "../models/CouponAccess.js";
import User from "../models/User.js";
import { Question } from "../models/rowQuestionSchema.js";
import PreviousYearTest from "../models/PreviousYearTest.js";
import CustomTest from "../models/CustomTest.js";

// ─────────────────────────────────────────────
// MAIN TEACHER dashboard — sab kuch apne coupons ke across
// ─────────────────────────────────────────────
const buildMainTeacherDashboard = async (teacher) => {
  const coupons = await Coupon.find({ mainTeacher: teacher._id })
    .select("name code exam createdAt")
    .sort({ createdAt: -1 });

  const couponIds = coupons.map((c) => c._id);

  if (couponIds.length === 0) {
    return {
      role: "main",
      totalCoupons: 0,
      totalStudents: 0,
      totalSubTeachers: { active: 0, pending: 0 },
      totalQuestionsAdded: 0,
      previousYearPapers: { total: 0, complete: 0, draft: 0 },
      totalCustomTests: 0,
      coupons: [],
    };
  }

  // Per-coupon student counts — ek hi aggregate mein
  const studentCountsAgg = await User.aggregate([
    { $match: { activeCoupon: { $in: couponIds } } },
    { $group: { _id: "$activeCoupon", count: { $sum: 1 } } },
  ]);
  const studentCountMap = {};
  let totalStudents = 0;
  studentCountsAgg.forEach((s) => {
    studentCountMap[s._id.toString()] = s.count;
    totalStudents += s.count;
  });

  const [activeSubTeachers, pendingSubTeachers, totalQuestionsAdded, pyqPapers, totalCustomTests] =
    await Promise.all([
      Teacher.countDocuments({ parentTeacher: teacher._id, status: "active" }),
      Teacher.countDocuments({ parentTeacher: teacher._id, status: "pending" }),
      Question.countDocuments({ coupon: { $in: couponIds } }),
      PreviousYearTest.find({ couponId: { $in: couponIds } }).select("status"),
      CustomTest.countDocuments({ couponId: { $in: couponIds } }),
    ]);

  const completePapers = pyqPapers.filter((p) => p.status === "complete").length;

  const couponBreakdown = coupons.map((c) => ({
    couponId: c._id,
    name: c.name,
    code: c.code,
    exam: c.exam,
    studentCount: studentCountMap[c._id.toString()] || 0,
    createdAt: c.createdAt,
  }));

  return {
    role: "main",
    totalCoupons: coupons.length,
    totalStudents,
    totalSubTeachers: { active: activeSubTeachers, pending: pendingSubTeachers },
    totalQuestionsAdded,
    previousYearPapers: {
      total: pyqPapers.length,
      complete: completePapers,
      draft: pyqPapers.length - completePapers,
    },
    totalCustomTests,
    coupons: couponBreakdown,
  };
};

// ─────────────────────────────────────────────
// SUB-TEACHER dashboard — sirf authorized coupons + apna contribution
// ─────────────────────────────────────────────
const buildSubTeacherDashboard = async (teacher) => {
  const accessRecords = await CouponAccess.find({ subTeacher: teacher._id }).populate(
    "coupon",
    "name code exam"
  );

  const couponMap = {};
  for (const record of accessRecords) {
    if (!record.coupon) continue; // safety — coupon delete ho chuka ho to
    const cid = record.coupon._id.toString();
    if (!couponMap[cid]) {
      couponMap[cid] = {
        couponId: record.coupon._id,
        name: record.coupon.name,
        code: record.coupon.code,
        exam: record.coupon.exam,
        subjects: [],
      };
    }
    couponMap[cid].subjects.push(record.subject);
  }
  const authorizedCoupons = Object.values(couponMap);

  // Active-coupon ke student count — sub-teacher ka "current working batch"
  let activeCouponStudentCount = 0;
  if (teacher.activeCoupon) {
    activeCouponStudentCount = await User.countDocuments({ activeCoupon: teacher.activeCoupon });
  }

  const [questionsAdded, customTestsCreated] = await Promise.all([
    Question.countDocuments({ addedByTeacher: teacher._id }),
    CustomTest.countDocuments({ createdBy: teacher._id }),
  ]);

  return {
    role: "sub",
    totalAuthorizedCoupons: authorizedCoupons.length,
    activeCouponStudentCount,
    myContribution: {
      questionsAdded,
      customTestsCreated,
    },
    coupons: authorizedCoupons,
  };
};

export const getTeacherDashboard = async (req, res) => {
  try {
    const teacher = req.teacher;

    const dashboardData =
      teacher.role === "main"
        ? await buildMainTeacherDashboard(teacher)
        : await buildSubTeacherDashboard(teacher);

    return res.status(200).json({
      success: true,
      data: {
        teacherName: teacher.name,
        teacherRole: teacher.role,
        ...dashboardData,
      },
    });
  } catch (error) {
    console.error("getTeacherDashboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Dashboard fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};