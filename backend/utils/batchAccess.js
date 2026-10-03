// backend/utils/batchAccess.js
//
// Batch (coupon) me kaun jud sakta hai — redeemCoupon.js aur addUser.js
// (coupon-signup wala path) dono yahi use karte hain, taaki niyam ek jagah rahe.
import AllowedStudent from "../models/AllowedStudent.js";
import Coupon from "../models/Coupon.js";

/**
 * Batch public hai ya private.
 * Teacher ne chuna ho to wahi. Purane batch (jab ye option nahi tha) pehle
 * jaise chalte hain: list khaali = sabke liye khula, list hai = invite-only.
 */
export const effectiveVisibility = (coupon, listCount) =>
  coupon?.visibility || (listCount > 0 ? "private" : "public");

/**
 * @param {ObjectId} couponId
 * @param {{ phone?: string, email?: string }} identifiers - joining student ka phone/email
 * @param {ObjectId|null} userId - account ban chuka ho to list wali entry pe naam likh dete hain
 * @returns {{ allowed: boolean, restricted: boolean }}
 *   restricted=false → public batch, code wala koi bhi jud sakta hai
 *   restricted=true  → private batch, sirf list wale (allowed batata hai match hua ya nahi)
 */
export const checkAndMatchAllowedStudent = async (couponId, { phone, email } = {}, userId = null) => {
  const [coupon, totalEntries] = await Promise.all([
    Coupon.findById(couponId).select("visibility").lean(),
    AllowedStudent.countDocuments({ coupon: couponId }),
  ]);
  const isPublic = effectiveVisibility(coupon, totalEntries) === "public";

  const orConditions = [];
  if (phone) orConditions.push({ phone: String(phone).trim() });
  if (email) orConditions.push({ email: String(email).toLowerCase().trim() });

  // Public batch me bhi list wala student mile to "joined" dikhe
  const match = totalEntries > 0 && orConditions.length
    ? await AllowedStudent.findOne({ coupon: couponId, $or: orConditions })
    : null;

  if (match && userId && !match.matchedUser) {
    match.matchedUser = userId;
    match.matchedAt = new Date();
    await match.save();
  }

  if (isPublic) return { allowed: true, restricted: false };
  return { allowed: !!match, restricted: true };
};
