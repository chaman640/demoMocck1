// utils/safeError.js
// ─────────────────────────────────────────────
// Kai controllers apne catch block me aisa karte the:
//
//     res.status(500).json({ success: false, message: "...", error: error.message })
//
// PROBLEM: `error.message` me aksar andar ki jaankari hoti hai —
//   "Cast to ObjectId failed for value 'abc' at path 'coupon' for model 'Question'"
//   "E11000 duplicate key error collection: mockTest.users index: phone_1"
//
// Isse baahar wale ko aapke database ke model, field aur index tak ke naam pata
// chal jate hain — aur wahi se agla attack banta hai.
//
// server.js ka global error handler ye pehle se sambhalta hai, lekin ye
// controllers khud `res.json()` karke usse bypass kar dete the.
//
// ISTEMAL:
//     import { errorDetail } from "../utils/safeError.js";
//     res.status(500).json({ success:false, message:"...", ...errorDetail(error) });
//
// Development me error message pehle jaisa dikhta hai (debug ke liye),
// production me bilkul nahi jata — lekin server ke logs me hamesha rehta hai.
// ─────────────────────────────────────────────

export const errorDetail = (error) => {
  if (process.env.NODE_ENV === "production") return {};
  return { error: error?.message || String(error) };
};

export default errorDetail;
