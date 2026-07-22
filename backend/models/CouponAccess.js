// models/CouponAccess.js
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const couponAccessSchema = new mongoose.Schema(
  {
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },
    subTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    subject: { type: String, required: true },
  },
  { timestamps: true }
);

// Same (coupon, teacher, subject) combo dobara na bane
couponAccessSchema.index({ coupon: 1, subTeacher: 1, subject: 1 }, { unique: true });

const CouponAccess = rowQuestionConnection.model("CouponAccess", couponAccessSchema);
export default CouponAccess;