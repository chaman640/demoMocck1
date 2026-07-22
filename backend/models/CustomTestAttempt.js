// models/CustomTestAttempt.js
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const customTestAttemptSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomTest",
      required: [true, "Test ID zaroori hai"],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID zaroori hai"],
      index: true,
    },

    // Denormalized — list dikhane ke liye baar-baar populate na karna pade
    examName: { type: String, required: true },
    testName: { type: String, required: true },
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },

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

// PreviousYearAttempt.js jaisa hi pattern — MULTIPLE attempts allowed
// (practice/retake ke liye), isliye Challenge jaisa unique index nahi hai
customTestAttemptSchema.index({ testId: 1, userId: 1, createdAt: -1 });

const CustomTestAttempt = rowQuestionConnection.model(
  "CustomTestAttempt",
  customTestAttemptSchema
);

export default CustomTestAttempt;