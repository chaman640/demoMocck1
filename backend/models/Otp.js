// backend/models/Otp.js
//
// 🆕 CHANGE — pehle ye sirf phone-based tha (SMS OTP). Ab OTP email par
// jaata hai, isliye `phone` field ka naam generalize karke `identifier`
// kar diya hai (isme email address store hoga). Purana `purpose` enum mein
// "teacher_reset" bhi add kiya taaki teacher forgot-password isi model/service
// ko reuse kar sake.
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const otpSchema = new mongoose.Schema(
  {
    identifier: { type: String, required: true, index: true }, // email address
    purpose: { type: String, enum: ["signup", "reset", "teacher_reset"], required: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index — MongoDB khud expired OTP docs ko background mein delete kar dega
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default rowQuestionConnection.model("Otp", otpSchema);
