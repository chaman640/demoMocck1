// models/Performance.js
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const performanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID zaroori hai"],
    },

    attemptedQuestions: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
          required: true,
        },
        userAnswer: {
          type: String,
          // BUG FIX: required: true hata diya —
          // unattempted questions mein userAnswer null/empty hoga
          // required: true se puri performance save fail ho jaati thi
          default: null,
        },
        isCorrect: {
          type: Boolean,
          default: null,
        },
        // Frontend se aayega — student ne kitne seconds mein answer diya
        // null allowed hai — agar frontend ne nahi bheja (unattempted questions)
        timeTakenInSeconds: {
          type: Number,
          default: null,
          min: [0, "Time negative nahi ho sakta"],
        },
      },
    ],

    examName: {
      type: String,
      required: [true, "Main exam ka naam zaroori hai (e.g., UP Constable)"],
      trim: true,
    },
    blueprintName: {
      type: String,
      required: [true, "Specific test ka naam zaroori hai (e.g., UP Constable Full Mock 1)"],
      trim: true,
    },

    // Analytics fields (backend calculate karta hai)
    totalScore:       { type: Number, default: 0 },
    correctCount:     { type: Number, default: 0 },
    wrongCount:       { type: Number, default: 0 },
    unattemptedCount: { type: Number, default: 0 },

    subjectAnalysis: [
      {
        subjectName:    String,
        accuracy:       Number,
        correctCount:   Number,
        // BUG FIX: ye dono fields schema mein missing the —
        // addPerformence.js save karta tha but Mongoose silently drop kar deta tha
        // Ab schema mein add kiya — ab sahi se save honge
        wrongCount:       { type: Number, default: 0 },
        unattemptedCount: { type: Number, default: 0 },
        totalQuestions:   Number,
        // Subject-wise time tracking ke liye
        totalTimeTaken:          { type: Number, default: 0 },
        averageTimePerQuestion:  { type: Number, default: 0 },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Performance = rowQuestionConnection.model("Performance", performanceSchema);

export default Performance;