// models/PreviousYearAttempt.js
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const previousYearAttemptSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PreviousYearTest",
      required: [true, "Test ID zaroori hai"],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID zaroori hai"],
      index: true,
    },

    // Denormalized — baar baar populate na karna pade list dikhane ke liye
    examName: { type: String, required: true },
    testName: { type: String, required: true },
    year: { type: Number, required: true },

    attemptedQuestions: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
        userAnswer: { type: String, default: null },
        isCorrect: { type: Boolean, default: null },
        timeTakenInSeconds: {
          type: Number,
          default: null,
          min: [0, "Time negative nahi ho sakta"],
        },
      },
    ],

    totalScore: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    unattemptedCount: { type: Number, default: 0 },
    totalTimeTakenInSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Ek user ek test ko MULTIPLE baar de sakta hai (retake/practice ke liye) —
// isliye Challenge jaisa unique index yahan NAHI hai. Har attempt alag
// document banega, taaki user apna improvement track kar sake.
previousYearAttemptSchema.index({ testId: 1, userId: 1, createdAt: -1 });

const PreviousYearAttempt = rowQuestionConnection.model(
  "PreviousYearAttempt",
  previousYearAttemptSchema
);

export default PreviousYearAttempt;