// models/User.js
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name zaroori hai"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email zaroori hai"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number zaroori hai"],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password zaroori hai"],
      minlength: [6, "Password kam se kam 6 characters ka hona chahiye"],
    },
    address: {
      type: String,
      required: [true, "Address zaroori hai"],
      trim: true,
    },
    exam: {
      type: String,
      required: [true, "Exam ka naam zaroori hai"],
      trim: true,
    },

    // ─────────────────────────────────────────────
    // 👇 NAYA: Teacher-section ke liye — coupon/group linkage.
    // exam-change wale pattern jaisa hi hai: ek waqt me sirf
    // ek active coupon, purana switch karne par delete nahi hota.
    // ─────────────────────────────────────────────
    activeCoupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },

    // Poori history — coupon switch karte waqt purana entry ka
    // leftAt set ho jata hai, naya entry push hota hai. Purana
    // data kabhi delete nahi hota, sirf context badalta hai.
    couponHistory: [
      {
        coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },
        examNameAtJoin: { type: String }, // us waqt kaunsa exam tha, reference ke liye
        joinedAt: { type: Date, default: Date.now },
        leftAt: { type: Date, default: null }, // null = abhi bhi active
      },
    ],
  },
  {
    timestamps: true,
  }
);

const User = rowQuestionConnection.model("User", userSchema);

export default User;