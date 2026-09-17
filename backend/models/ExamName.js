// backend/models/ExamName.js
//
// 🆕 NAYA — pehle exam names ek hardcoded array tha (allExamName.js ke
// andar). Naya exam add karne ke liye code change + redeploy karna padta
// tha. Ab ye ek collection hai jise Admin Panel se manage kiya ja sakta hai.
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const examNameSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

export default rowQuestionConnection.model("ExamName", examNameSchema);
