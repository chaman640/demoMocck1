import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const currentAffairItemSchema = new mongoose.Schema(
  {
    headline: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    category: { type: String, trim: true, default: "General" },
    imageUrl: { type: String },
    source: { type: String },
  },
  { _id: false }
);

const currentAffairSchema = new mongoose.Schema(
  {
    examName: {
      type: String,
      required: [true, "Exam ka naam zaroori hai"],
      trim: true,
      index: true,
    },
    date: {
      type: String, // "YYYY-MM-DD" — IST date key
      required: [true, "Date zaroori hai"],
      trim: true,
    },
    title: { type: String, trim: true },
    items: [currentAffairItemSchema],
    // 🆕 NAYA — null = Admin ne global (poore exam ke liye) daala hai.
    // Value set ho to matlab kisi Teacher ne apne specific batch ke liye
    // daala hai — sirf usi batch ke students ko ye extra items dikhenge
    // (global wale ke saath jud ke).
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", default: null },
    addedByTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", default: null },
  },
  { timestamps: true }
);

// 🆕 CHANGE — pehle sirf examName+date par unique tha, isliye ek din mein
// EK hi entry ban sakti thi (chahe global ho ya kisi batch ki). Ab
// "coupon" bhi shaamil hai — isliye ek hi din, ek hi exam ke liye,
// Admin ka EK global entry + har batch ka apna EK entry — sab ek saath
// reh sakte hain.
currentAffairSchema.index({ examName: 1, date: 1, coupon: 1 }, { unique: true });

const CurrentAffair = rowQuestionConnection.model("CurrentAffair", currentAffairSchema);
export default CurrentAffair;
