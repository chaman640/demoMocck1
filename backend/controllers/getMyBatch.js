// controllers/getMyBatch.js
// Student ko apne current batch (coupon) ki details deta hai — batch naam,
// exam, aur transparency ke liye "kaunsa subject kis teacher ne cover kiya"
// ki list. Route: GET /my-batch (userInfo middleware ke peeche)
import Coupon from "../models/Coupon.js";
import CouponAccess from "../models/CouponAccess.js";
import Teacher from "../models/Teacher.js";

export const getMyBatch = async (req, res) => {
  try {
    // ─────────────────────────────────────────────
    // STEP 1: Student kisi batch mein hai hi nahi to seedha bata do
    // ─────────────────────────────────────────────
    if (!req.user.activeCoupon) {
      return res.status(200).json({
        success: true,
        enrolled: false,
        data: null,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 2: Coupon dhundo
    // ─────────────────────────────────────────────
    const coupon = await Coupon.findById(req.user.activeCoupon).populate(
      "mainTeacher",
      "name"
    );

    // Safety: agar coupon kisi wajah se DB se delete ho chuka ho,
    // lekin student ki activeCoupon reference abhi bhi purani ho
    if (!coupon) {
      return res.status(200).json({
        success: true,
        enrolled: false,
        data: null,
        message: "Aapka pehle wala batch ab available nahi hai.",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 3: Is coupon ke sabhi sub-teachers ka subject-wise breakdown
    // (CouponAccess se) — transparency ke liye student ko dikhega
    // "kaunsa subject kis teacher ne cover kiya hai"
    // ─────────────────────────────────────────────
    const accessRecords = await CouponAccess.find({ coupon: coupon._id }).populate(
      "subTeacher",
      "name status"
    );

    // Sirf "active" sub-teachers dikhao — removed teacher ka naam
    // student ko dikhane ka koi matlab nahi
    const subjectTeacherMap = accessRecords
      .filter((r) => r.subTeacher && r.subTeacher.status === "active")
      .map((r) => ({
        subject: r.subject,
        teacherName: r.subTeacher.name,
      }));

    // ─────────────────────────────────────────────
    // STEP 4: Response
    // ─────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      enrolled: true,
      data: {
        _id: coupon._id,
        name: coupon.name,
        code: coupon.code,
        exam: coupon.exam,
        mainTeacherName: coupon.mainTeacher?.name || null,
        subjectCoverage: subjectTeacherMap,
        joinedAt:
          req.user.couponHistory.find(
            (h) => h.coupon.toString() === coupon._id.toString() && h.leftAt === null
          )?.joinedAt || null,
      },
    });
  } catch (error) {
    console.error("getMyBatch error:", error);
    return res.status(500).json({
      success: false,
      message: "Batch details fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};