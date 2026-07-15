// models/RankPredictorData.js
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const rankPredictorDataSchema = new mongoose.Schema(
  {
    examName: {
      type: String,
      required: [true, "Exam ka naam zaroori hai"],
      trim: true,
      index: true,
    },

    // Kis saal/attempt ka data hai — future mein multiple years support
    // karne ke liye (abhi ke liye ek hi "current" wala use hoga)
    year: {
      type: Number,
      required: true,
    },

    // Reference points — score aur uske corresponding rank
    // Frontend/backend isi array ko sort karke interpolate karega
    dataPoints: [
      {
        score: { type: Number, required: true },
        rank: { type: Number, required: true },
      },
    ],

    // Total kitne candidates ne exam diya tha (context ke liye)
    totalCandidates: {
      type: Number,
    },

    // Total vacancies — "selection chance" dikhane ke liye
    totalVacancies: {
      type: Number,
    },

    // Kya ye data currently active hai (predictor mein use hoga)
    // Agar naya saal ka data aaye, purana inactive kar denge
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Ek exam ke liye ek hi "active" year ka data ho — duplicate active entries na banein
rankPredictorDataSchema.index({ examName: 1, isActive: 1 });

const RankPredictorData = rowQuestionConnection.model(
  "RankPredictorData",
  rankPredictorDataSchema
);

export default RankPredictorData;