import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const currentAffairAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    examName: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true }, // kis din ka quiz tha

    attemptedQuestions: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, required: true }, // CurrentAffairQuiz.questions._id
        userAnswer: { type: String, default: null },
        isCorrect: { type: Boolean, default: null },
      },
    ],

    totalScore: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    unattemptedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Ek user ek din ka quiz sirf ek baar de sake (usi exam ke liye)
currentAffairAttemptSchema.index({ userId: 1, examName: 1, date: 1 }, { unique: true });

const CurrentAffairAttempt = rowQuestionConnection.model(
  "CurrentAffairAttempt",
  currentAffairAttemptSchema
);
export default CurrentAffairAttempt;