// backend/utils/batchAccess.js
//
// 🆕 NAYA — reusable check jo redeemCoupon.js aur addUser.js (coupon-signup
// wala path) dono use karte hain. Ek hi jagah logic rakhne se dono jagah
// consistent rehta hai.
import AllowedStudent from "../models/AllowedStudent.js";

/**
 * @param {ObjectId} couponId
 * @param {{ phone?: string, email?: string }} identifiers - joining student ka phone/email
 * @param {ObjectId|null} userId - agar student ka account already ban chuka hai (matched record par likhne ke liye)
 * @returns {{ allowed: boolean, restricted: boolean }}
 *   restricted=false  → is batch mein koi list hi nahi hai, sabke liye khula hai
 *   restricted=true, allowed=true  → list hai aur ye student usme match ho gaya
 *   restricted=true, allowed=false → list hai aur ye student usme nahi hai
 */
export const checkAndMatchAllowedStudent = async (couponId, { phone, email } = {}, userId = null) => {
  const totalEntries = await AllowedStudent.countDocuments({ coupon: couponId });
  if (totalEntries === 0) {
    return { allowed: true, restricted: false };
  }

  const orConditions = [];
  if (phone) orConditions.push({ phone: String(phone).trim() });
  if (email) orConditions.push({ email: String(email).toLowerCase().trim() });

  if (orConditions.length === 0) {
    return { allowed: false, restricted: true };
  }

  const match = await AllowedStudent.findOne({ coupon: couponId, $or: orConditions });
  if (!match) {
    return { allowed: false, restricted: true };
  }

  if (userId && !match.matchedUser) {
    match.matchedUser = userId;
    match.matchedAt = new Date();
    await match.save();
  }

  return { allowed: true, restricted: true };
};
