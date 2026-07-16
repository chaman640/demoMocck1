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
  },
  { timestamps: true }
);

// Ek exam ke liye ek din mein sirf ek hi entry ho
currentAffairSchema.index({ examName: 1, date: 1 }, { unique: true });

const CurrentAffair = rowQuestionConnection.model("CurrentAffair", currentAffairSchema);
export default CurrentAffair;