import Promoter from "../models/Promoter.js";
import Teacher from "../models/Teacher.js";
import Coupon from "../models/Coupon.js";
import User from "../models/User.js";

export const adminSettlePromoterCommission = async (req, res) => {
  try {
    const { promoterId } = req.params;
    const { amount, note } = req.body;

    const numericAmount = Number(amount);
    if (amount === undefined || amount === null || amount === "" || Number.isNaN(numericAmount) || numericAmount < 0) {
      return res.status(400).json({ success: false, message: "Please enter a valid amount!" });
    }

    const promoter = await Promoter.findById(promoterId);
    if (!promoter) {
      return res.status(404).json({ success: false, message: "Promoter not found!" });
    }

    // Atomic: sirf utne hi questions ghatao jitne settle hue — pehle poora
    // count 0 kar diya jaata tha, isliye padhne aur save ke beech students ke
    // attempt kiye questions mit jaate the (aur double-click par do payments
    // ban jaati thi)
    const settledCount = promoter.pendingQuestionsCount || 0;
    const updated = await Promoter.findOneAndUpdate(
      { _id: promoter._id, pendingQuestionsCount: { $gte: settledCount } },
      {
        $inc: { pendingQuestionsCount: -settledCount },
        $push: {
          paymentHistory: {
            amount: numericAmount,
            questionsSettled: settledCount,
            settledAt: new Date(),
            note: note ? String(note).trim() : "",
          },
        },
      },
      { new: true }
    );
    if (!updated) {
      return res.status(409).json({ success: false, message: "The balance just changed — refresh the page and settle again." });
    }
    Object.assign(promoter, {
      pendingQuestionsCount: updated.pendingQuestionsCount,
      totalQuestionsAllTime: updated.totalQuestionsAllTime,
      paymentHistory: updated.paymentHistory,
    });

    return res.status(200).json({
      success: true,
      message: "Balance settled!",
      data: {
        _id: promoter._id,
        pendingQuestionsCount: promoter.pendingQuestionsCount,
        totalQuestionsAllTime: promoter.totalQuestionsAllTime,
        paymentHistory: promoter.paymentHistory,
      },
    });
  } catch (error) {
    console.error("adminSettlePromoterCommission error:", error);
    return res.status(500).json({ success: false, message: "Error while settling the balance." });
  }
};

export const adminSettleTeacherCommission = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { amount, note } = req.body;

    const numericAmount = Number(amount);
    if (amount === undefined || amount === null || amount === "" || Number.isNaN(numericAmount) || numericAmount < 0) {
      return res.status(400).json({ success: false, message: "Please enter a valid amount!" });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found!" });
    }
    if (teacher.role !== "main") {
      return res.status(400).json({
        success: false,
        message: "Only a Main Teacher's balance can be settled.",
      });
    }

    // Atomic: sirf utne hi questions ghatao jitne settle hue — pehle poora
    // count 0 kar diya jaata tha, isliye padhne aur save ke beech students ke
    // attempt kiye questions mit jaate the (aur double-click par do payments
    // ban jaati thi)
    const settledCount = teacher.pendingQuestionsCount || 0;
    const updated = await Teacher.findOneAndUpdate(
      { _id: teacher._id, pendingQuestionsCount: { $gte: settledCount } },
      {
        $inc: { pendingQuestionsCount: -settledCount },
        $push: {
          paymentHistory: {
            amount: numericAmount,
            questionsSettled: settledCount,
            settledAt: new Date(),
            note: note ? String(note).trim() : "",
          },
        },
      },
      { new: true }
    );
    if (!updated) {
      return res.status(409).json({ success: false, message: "The balance just changed — refresh the page and settle again." });
    }
    Object.assign(teacher, {
      pendingQuestionsCount: updated.pendingQuestionsCount,
      totalQuestionsAllTime: updated.totalQuestionsAllTime,
      paymentHistory: updated.paymentHistory,
    });

    return res.status(200).json({
      success: true,
      message: "Balance settled!",
      data: {
        _id: teacher._id,
        pendingQuestionsCount: teacher.pendingQuestionsCount,
        totalQuestionsAllTime: teacher.totalQuestionsAllTime,
        paymentHistory: teacher.paymentHistory,
      },
    });
  } catch (error) {
    console.error("adminSettleTeacherCommission error:", error);
    return res.status(500).json({ success: false, message: "Error while settling the balance." });
  }
};

export const adminListTeacherCommissions = async (req, res) => {
  try {
    const teachers = await Teacher.find({ role: "main", status: { $ne: "pending" } })
      .select("name email phone status pendingQuestionsCount totalQuestionsAllTime paymentHistory")
      .sort({ name: 1 });

    const teacherIds = teachers.map((t) => t._id);
    const coupons = teacherIds.length
      ? await Coupon.find({ mainTeacher: { $in: teacherIds } }).select("_id mainTeacher")
      : [];

    const couponOwner = new Map(coupons.map((c) => [String(c._id), String(c.mainTeacher)]));
    const counts = coupons.length
      ? await User.aggregate([
          { $match: { activeCoupon: { $in: coupons.map((c) => c._id) } } },
          { $group: { _id: "$activeCoupon", n: { $sum: 1 } } },
        ])
      : [];

    const studentsByTeacher = new Map();
    for (const row of counts) {
      const owner = couponOwner.get(String(row._id));
      if (owner) studentsByTeacher.set(owner, (studentsByTeacher.get(owner) || 0) + row.n);
    }
    const batchesByTeacher = new Map();
    for (const c of coupons) {
      const owner = String(c.mainTeacher);
      batchesByTeacher.set(owner, (batchesByTeacher.get(owner) || 0) + 1);
    }

    const data = teachers.map((t) => ({
      _id: t._id,
      name: t.name,
      email: t.email,
      phone: t.phone,
      status: t.status,
      totalBatches: batchesByTeacher.get(String(t._id)) || 0,
      totalStudents: studentsByTeacher.get(String(t._id)) || 0,
      pendingQuestionsCount: t.pendingQuestionsCount || 0,
      totalQuestionsAllTime: t.totalQuestionsAllTime || 0,
      paymentHistory: t.paymentHistory || [],
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("adminListTeacherCommissions error:", error);
    return res.status(500).json({ success: false, message: "Error while listing teachers." });
  }
};
