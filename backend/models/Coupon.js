// models/Coupon.js
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true }, // teacher ke liye readable label, switch-dropdown mein dikhega
    exam: { type: String, required: true },

    mainTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Coupon = rowQuestionConnection.model("Coupon", couponSchema);
export default Coupon;