import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const studentNoteSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    teacherName: { type: String, required: true },
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },
    note: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export default rowQuestionConnection.model("StudentNote", studentNoteSchema);
