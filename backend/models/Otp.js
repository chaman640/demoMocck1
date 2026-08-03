import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const otpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    purpose: { type: String, enum: ["signup", "reset"], required: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index — MongoDB khud expired OTP docs ko background mein delete kar dega
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default rowQuestionConnection.model("Otp", otpSchema);