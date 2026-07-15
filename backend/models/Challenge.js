// models/Challenge.js
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const challengeSchema = new mongoose.Schema(
  {
    // Challenge kisne banaya — dost ko challenge bhejne wala user
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Challenge banane wale user ki ID zaroori hai"],
    },

    // Konsa exam aur konsa blueprint (jaise "UP Police Constable" + "Full Mock 1")
    examName: {
      type: String,
      required: [true, "Exam ka naam zaroori hai"],
      trim: true,
    },
    blueprintName: {
      type: String,
      required: [true, "Blueprint ka naam zaroori hai"],
      trim: true,
    },

    // Unique short code jisse shareable link banega (e.g. "AB3X9K")
    // Isi code se dost challenge open karega: yourapp.com/#/Challenge/AB3X9K
    challengeCode: {
      type: String,
      required: true,
      unique: true,
      index: true, // fast lookup ke liye — har baar /challenge/:code pe query hogi
    },

    // ─────────────────────────────────────────────
    // FROZEN QUESTIONS — Ye sabse important part hai.
    // Jab challenge banta hai, tab ek baar mock-jaisa
    // question set generate karke yahan PERMANENTLY save
    // kar diya jata hai. Isse fark nahi padta ki 5 log
    // alag-alag din pe attempt karein — sabko EXACT same
    // questions milenge, isliye comparison fair rahega.
    //
    // Note: Yahan hum poora question object store kar rahe
    // hain (sirf ID nahi) — taaki agar original Question
    // document baad mein edit/delete ho jaye, challenge
    // fir bhi kaam kare aur data consistent rahe.
    // ─────────────────────────────────────────────
    subjects: [
      {
        subjectName: { type: String, required: true },
        questions: [
          {
            _id: false, // yahan hum apna khud ka sub-_id nahi chahte, original questionId use karenge
            questionId: {
              type: mongoose.Schema.Types.ObjectId,
              required: true,
            },
            question: { type: String, required: true },
            option1: { type: String, required: true },
            option2: { type: String, required: true },
            option3: { type: String, required: true },
            option4: { type: String, required: true },
            correctOption: { type: Number, required: true },
            answerExplain: { type: String },
            topicName: { type: String },
            subjectName: { type: String },
            questionNumber: { type: Number },
          },
        ],
      },
    ],
     createdByName: {
      type: String,
      required: [true, "Challenge banane wale ka naam zaroori hai"],
      },
    // Scoring rules bhi freeze kar rahe hain challenge ke waqt
    // (agar baad mein blueprint ke marks/negative marking badal jaye,
    // is challenge ke purane attempts ka scoring change nahi hona chahiye)
    marksPerQuestion: {
      type: Number,
      required: true,
    },
    negativeMarking: {
      type: Number,
      required: true,
      default: 0,
    },
    durationMinutes: {
      type: Number,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },

    // Challenge kab expire hoga — is date ke baad naya attempt allow nahi
    // (purane challenges DB mein clutter na banayein, isliye expiry zaroori hai)
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt apne aap aa jayenge
  }
);

// ─────────────────────────────────────────────
// TTL INDEX — MongoDB khud is document ko expiresAt ke
// 0 seconds baad automatically delete kar dega.
// Isse humein manual cron job nahi likhni padegi purane
// challenges saaf karne ke liye.
// ─────────────────────────────────────────────
challengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Challenge = rowQuestionConnection.model("Challenge", challengeSchema);

export default Challenge;