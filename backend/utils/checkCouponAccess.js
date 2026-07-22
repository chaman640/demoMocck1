// utils/checkCouponAccess.js
// Reusable authorization helper — aage ke sabhi controllers (PYQ fill,
// custom test, analysis) isi function ko import karke check karenge
// ki teacher current coupon/subject ka access rakhta hai ya nahi.
import Coupon from "../models/Coupon.js";
import CouponAccess from "../models/CouponAccess.js";

/**
 * @param {object} teacher - req.teacher (Main ya Sub)
 * @param {string} couponId
 * @param {string|null} subject - null pass karo agar sirf coupon-level check karna hai
 * @returns {Promise<{ allowed: boolean, coupon: object|null, reason?: string }>}
 */
export const checkCouponAccess = async (teacher, couponId, subject = null) => {
  if (!couponId) {
    return { allowed: false, coupon: null, reason: "couponId zaroori hai." };
  }

  const coupon = await Coupon.findById(couponId);
  if (!coupon) {
    return { allowed: false, coupon: null, reason: "Coupon nahi mila." };
  }

  // Main Teacher — agar wahi coupon ka owner hai, hamesha allow
  if (teacher.role === "main") {
    if (coupon.mainTeacher.toString() === teacher._id.toString()) {
      return { allowed: true, coupon };
    }
    return { allowed: false, coupon, reason: "Ye aapka coupon nahi hai." };
  }

  // Sub Teacher — CouponAccess record dhundo
  const query = { coupon: coupon._id, subTeacher: teacher._id };
  if (subject) query.subject = subject;

  const access = await CouponAccess.findOne(query);
  if (!access) {
    return {
      allowed: false,
      coupon,
      reason: subject
        ? `Aap is coupon ke '${subject}' subject ke liye authorized nahi hain.`
        : "Aap is coupon ke liye authorized nahi hain.",
    };
  }

  return { allowed: true, coupon };
};