// backend/models/AdminLoginToken.js
//
// 🆕 NAYA — Admin passwordless magic-link login ke liye. Token hamesha
// hash karke store hota hai (plaintext kabhi DB mein nahi), aur verify
// hote hi consume (delete) ho jata hai — link sirf ek baar chalta hai.
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const adminLoginTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, index: true },
    email: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index — expired/unused tokens apne aap saaf ho jaate hain
adminLoginTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default rowQuestionConnection.model("AdminLoginToken", adminLoginTokenSchema);
