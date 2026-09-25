// models/Teacher.js
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const teacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String },

    role: { type: String, enum: ["main", "sub"], required: true },
    examName: [{ type: String }], // teacher jis exam(o) ke liye kaam karta hai

    // ---- Sub-teacher-only ----
    parentTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", default: null },
    assignedSubjects: [{ type: String }],

    // ---- Main-teacher-only ----
    subTeachers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Teacher" }],

    // ---- Invite / activation flow ----
    status: { type: String, enum: ["pending", "active", "removed"], default: "pending" },
    inviteToken: { type: String, default: null },
    inviteTokenExpiry: { type: Date, default: null },

    // ---- Group (coupon) context ----
    activeCoupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", default: null },
    coupons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Coupon" }],

    pendingQuestionsCount: { type: Number, default: 0 },
    totalQuestionsAllTime: { type: Number, default: 0 },
    paymentHistory: [
      {
        amount: { type: Number, required: true },
        questionsSettled: { type: Number, required: true },
        settledAt: { type: Date, default: Date.now },
        note: { type: String, trim: true, default: "" },
      },
    ],
  },
  { timestamps: true }
);

const Teacher = rowQuestionConnection.model("Teacher", teacherSchema);
export default Teacher;