// controllers/getMyCoupons.js
// Dropdown ke liye — kaunse coupons/groups is teacher ko dikhne chahiye.
// Main Teacher: apne banaye sabhi coupons.
// Sub Teacher: sirf unhi coupons jinke liye CouponAccess record maujood hai
// (spec point 2A — "sub-teacher ki dropdown sirf authorized coupons dikhayegi").
import Coupon from "../models/Coupon.js";
import CouponAccess from "../models/CouponAccess.js";
import AllowedStudent from "../models/AllowedStudent.js";
import { effectiveVisibility } from "../utils/batchAccess.js";

export const getMyCoupons = async (req, res) => {
  try {
    const teacher = req.teacher;

    // ─────────────────────────────────────────────
    // CASE 1: Main Teacher — koi restriction nahi, wo coupon ka owner hai
    // ─────────────────────────────────────────────
    if (teacher.role === "main") {
      const coupons = await Coupon.find({ mainTeacher: teacher._id }).sort({ createdAt: -1 }).lean();

      // Har batch ki list kitni badi hai — Public/Private badge aur purane batch ka niyam isi se
      const counts = await AllowedStudent.aggregate([
        { $match: { coupon: { $in: coupons.map((c) => c._id) } } },
        { $group: { _id: "$coupon", n: { $sum: 1 } } },
      ]);
      const countOf = new Map(counts.map((c) => [String(c._id), c.n]));
      const data = coupons.map((c) => {
        const studentCount = countOf.get(String(c._id)) || 0;
        return { ...c, studentCount, visibility: effectiveVisibility(c, studentCount) };
      });

      return res.status(200).json({
        success: true,
        role: "main",
        totalCoupons: data.length,
        data,
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
      message: "Error while fetching coupons.",
      error: error.message,
    });
  }
};