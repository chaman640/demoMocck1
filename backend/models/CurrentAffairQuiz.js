import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const caQuizQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  option1: { type: String, required: true },
  option2: { type: String, required: true },
  option3: { type: String, required: true },
  option4: { type: String, required: true },
  correctOption: { type: Number, required: true },
  answerExplain: { type: String },
});
// _id: false NAHI lagaya — har question ko apna khud ka auto _id milega,
// isi se attempt mein answer track hoga (Challenge.js ke questions jaisa pattern)

const currentAffairQuizSchema = new mongoose.Schema(
  {
    examName: { type: String, required: true, trim: true, index: true },
    date: { type: String, required: true, trim: true },
    questions: [caQuizQuestionSchema],
  },
  { timestamps: true }
);

currentAffairQuizSchema.index({ examName: 1, date: 1 }, { unique: true });

const CurrentAffairQuiz = rowQuestionConnection.model("CurrentAffairQuiz", currentAffairQuizSchema);
export default CurrentAffairQuiz;