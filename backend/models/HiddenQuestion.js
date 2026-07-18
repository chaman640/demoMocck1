// models/HiddenQuestion.js
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const hiddenQuestionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);

// Ek user ek question ko sirf ek baar hide kar sake — duplicate na bane
hiddenQuestionSchema.index({ userId: 1, questionId: 1 }, { unique: true });

const HiddenQuestion = rowQuestionConnection.model("HiddenQuestion", hiddenQuestionSchema);
export default HiddenQuestion;