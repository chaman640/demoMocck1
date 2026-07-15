// models/ChallengeAttempt.js
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const challengeAttemptSchema = new mongoose.Schema(
  {
    // Kis challenge ka attempt hai — Challenge document ki reference
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Challenge",
      required: [true, "Challenge ID zaroori hai"],
      index: true, // leaderboard fetch karte waqt is field pe query hogi baar-baar
    },

    // Kisne attempt diya
    userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: [true, "User ID zaroori hai"],
  index: true,   // 👈 naya
},

    // Leaderboard mein naam dikhane ke liye — har baar User collection
    // populate karne ki jagah yahin bhi save kar rahe hain (denormalized).
    // Isse leaderboard query fast rahegi aur agar user apna naam badal
    // le baad mein, purana attempt ka naam consistent rahega.
    userName: {
      type: String,
      required: [true, "User ka naam zaroori hai"],
    },

    attemptedQuestions: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        userAnswer: {
          type: String,
          default: null, // unattempted questions ke liye null
        },
        isCorrect: {
          type: Boolean,
          default: null, // true/false/null (null = unattempted)
        },
        timeTakenInSeconds: {
          type: Number,
          default: null,
          min: [0, "Time negative nahi ho sakta"],
        },
      },
    ],
     challengeCode: { type: String, required: true },
     examName: { type: String, required: true },
     blueprintName: { type: String, required: true },
     createdByName: { type: String, required: true },
    // Score summary — Performance.js jaisa hi pattern
    totalScore: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    unattemptedCount: { type: Number, default: 0 },

    // Total time liya poore challenge mein (leaderboard pe "fastest" 
    // dikhane ke liye future mein kaam aa sakta hai — same score par
    // kam time lene wala upar aa sakta hai)
    totalTimeTakenInSeconds: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // submittedAt ke liye createdAt hi use karenge
  }
);

// ─────────────────────────────────────────────
// COMPOUND UNIQUE INDEX — Ek user ek challenge ko
// sirf EK BAAR attempt kar sake. Agar dobara submit
// karne ki koshish kare, DB level pe hi block ho jayega
// (application-level check ke sath-sath ye extra safety hai).
// ─────────────────────────────────────────────
challengeAttemptSchema.index({ challengeId: 1, userId: 1 }, { unique: true });

const ChallengeAttempt = rowQuestionConnection.model(
  "ChallengeAttempt",
  challengeAttemptSchema
);

export default ChallengeAttempt;