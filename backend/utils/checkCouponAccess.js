// utils/checkCouponAccess.js
// Reusable authorization helper — PYQ fill, custom test, analysis waghairah
// sab isi function se check karte hain ki teacher ke paas is coupon/subject
// ka access hai ya nahi.
import Coupon from "../models/Coupon.js";
import CouponAccess from "../models/CouponAccess.js";
import { ciExact, normalizeSubject } from "./subjectName.js";

/**
 * @param {object} teacher - req.teacher (Main ya Sub)
 * @param {string} couponId
 * @param {string|null} subject - null pass karo agar sirf coupon-level check karna hai
 * @returns {Promise<{ allowed: boolean, coupon: object|null, subject?: string, reason?: string }>}
 */
export const checkCouponAccess = async (teacher, couponId, subject = null) => {
  if (!couponId) {
    return { allowed: false, coupon: null, reason: "couponId is required." };
  }

  const coupon = await Coupon.findById(couponId);
  if (!coupon) {
    return { allowed: false, coupon: null, reason: "Coupon not found." };
  }

  // Main Teacher — agar wahi coupon ka owner hai, hamesha allow
  if (teacher.role === "main") {
    if (coupon.mainTeacher.toString() === teacher._id.toString()) {
      return { allowed: true, coupon, subject: normalizeSubject(subject) || null };
    }
    return { allowed: false, coupon, reason: "This is not your coupon." };
  }

  // Sub Teacher — CouponAccess record dhundo
  const query = { coupon: coupon._id, subTeacher: teacher._id };

  // 🐛 FIX: pehle yahan `query.subject = subject` tha — yaani BILKUL exact match.
  // Main Teacher ne agar "Maths" assign kiya aur kahin "maths" ya "Maths "
  // likha gaya, to sub-teacher ko 403 milta tha aur samajh hi nahi aata tha kyun.
  // Ab case aur extra space dono ignore hote hain.
  if (subject) query.subject = ciExact(subject);

  const access = await CouponAccess.findOne(query);
  if (!access) {
    return {
      allowed: false,
      coupon,
      reason: subject
        ? `You are not authorized for subject '${normalizeSubject(subject)}' in this coupon.`
        : "You are not authorized for this coupon.",
    };
  }

  // access.subject = DB me jo "sahi" spelling hai — aage wahi use karni chahiye
  return { allowed: true, coupon, subject: access.subject };
};
