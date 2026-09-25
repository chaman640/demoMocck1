import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const promoterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },

    code: { type: String, required: true, unique: true, uppercase: true, trim: true },

    status: { type: String, enum: ["active", "removed"], default: "active" },
    mustChangePassword: { type: Boolean, default: true },

    totalStudents: { type: Number, default: 0 },
    pendingQuestionsCount: { type: Number, default: 0 },
    totalQuestionsAllTime: { type: Number, default: 0 },

    paymentHistory: [
      {
        amount: { type: Number, required: true },
        questionsSettled: { type: Number, required: true },
        settledAt: { type: Date, default: Date.now },
        note: { type: String, trim: true, default: "" },
      },
    ],
  },
  { timestamps: true }
);

const Promoter = rowQuestionConnection.model("Promoter", promoterSchema);
export default Promoter;
