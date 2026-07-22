// controllers/getMyCoupons.js
// Dropdown ke liye — kaunse coupons/groups is teacher ko dikhne chahiye.
// Main Teacher: apne banaye sabhi coupons.
// Sub Teacher: sirf unhi coupons jinke liye CouponAccess record maujood hai
// (spec point 2A — "sub-teacher ki dropdown sirf authorized coupons dikhayegi").
import Coupon from "../models/Coupon.js";
import CouponAccess from "../models/CouponAccess.js";

export const getMyCoupons = async (req, res) => {
  try {
    const teacher = req.teacher;

    // ─────────────────────────────────────────────
    // CASE 1: Main Teacher — koi restriction nahi, wo coupon ka owner hai
    // ─────────────────────────────────────────────
    if (teacher.role === "main") {
      const coupons = await Coupon.find({ mainTeacher: teacher._id }).sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        role: "main",
        totalCoupons: coupons.length,
        data: coupons,
      });
    }

    // ─────────────────────────────────────────────
    // CASE 2: Sub Teacher — sirf authorized coupons, CouponAccess se
    // ─────────────────────────────────────────────
    const accessRecords = await CouponAccess.find({ subTeacher: teacher._id })
      .populate("coupon")
      .sort({ createdAt: -1 });

    // Ek hi coupon ke andar teacher ko multiple subjects mil sakte hain
    // (jaise Hindi + Maths dono ek hi group ke liye) — isliye coupon ke
    // hisaab se group karke duplicate coupons na bhejein, subjects ek
    // array mein daal ke bhejein.
    const couponMap = {};
    for (const record of accessRecords) {
      if (!record.coupon) continue; // safety — agar coupon kabhi delete ho chuka ho

      const couponId = record.coupon._id.toString();

      if (!couponMap[couponId]) {
        couponMap[couponId] = {
          ...record.coupon.toObject(),
          subjects: [],
        };
      }
      couponMap[couponId].subjects.push(record.subject);
    }

    const data = Object.values(couponMap);

    return res.status(200).json({
      success: true,
      role: "sub",
      totalCoupons: data.length,
      data,
    });
  } catch (error) {
    console.error("getMyCoupons error:", error);
    return res.status(500).json({
      success: false,
      message: "Coupons fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};