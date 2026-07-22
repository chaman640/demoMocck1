// controllers/getMySubTeachers.js
import Teacher from "../models/Teacher.js";
import CouponAccess from "../models/CouponAccess.js";

export const getMySubTeachers = async (req, res) => {
  try {
    if (req.teacher.role !== "main") {
      return res.status(403).json({
        success: false,
        message: "Sirf Main Teacher hi apne sub-teachers dekh sakta hai!",
      });
    }

    const subTeachers = await Teacher.find({ parentTeacher: req.teacher._id })
      .select("-password -inviteToken")
      .sort({ createdAt: -1 });

    if (subTeachers.length === 0) {
      return res.status(200).json({ success: true, totalSubTeachers: 0, data: [] });
    }

    const subTeacherIds = subTeachers.map((t) => t._id);

    const accessRecords = await CouponAccess.find({
      subTeacher: { $in: subTeacherIds },
    }).populate("coupon", "name code exam");

    // subTeacherId -> { couponId: { couponName, exam, subjects: [...] } }
    const accessMap = {};
    for (const record of accessRecords) {
      if (!record.coupon) continue; // safety — agar coupon kabhi delete ho chuka ho
      const subId = record.subTeacher.toString();
      if (!accessMap[subId]) accessMap[subId] = {};

      const couponId = record.coupon._id.toString();
      if (!accessMap[subId][couponId]) {
        accessMap[subId][couponId] = {
          couponId,
          couponName: record.coupon.name,
          couponCode: record.coupon.code,
          exam: record.coupon.exam,
          subjects: [],
        };
      }
      accessMap[subId][couponId].subjects.push(record.subject);
    }

    const data = subTeachers.map((t) => ({
      _id: t._id,
      name: t.name,
      email: t.email,
      phone: t.phone,
      status: t.status,
      createdAt: t.createdAt,
      coupons: accessMap[t._id.toString()] ? Object.values(accessMap[t._id.toString()]) : [],
    }));

    return res.status(200).json({ success: true, totalSubTeachers: data.length, data });
  } catch (error) {
    console.error("getMySubTeachers error:", error);
    return res.status(500).json({
      success: false,
      message: "Sub-teachers fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};