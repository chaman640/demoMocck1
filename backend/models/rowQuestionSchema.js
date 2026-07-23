import mongoose from "mongoose";
// ⚡ Sahi export naam (rowQuestionConnection) ko import kiya
import { rowQuestionConnection } from "../config/rowQuestion.js"; 

const questionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    questionPhoto: { type: String, required: false },
    option1: { type: String, required: true },
    option2: { type: String, required: true },
    option3: { type: String, required: true },
    option4: { type: String, required: true }, 
    correctOption: { type: Number, required: true }, 
    questionNumber: { type: Number },
    topicName: { type: String, required: true },
    
    // Spelling thik kar di: 'answerExplain'
    answerExplain: { type: String, required: true },
    answerExplainWithPhoto: { type: String, required: false },
    subjectName: { type: String, required: true },
    examName: { type: [String], required: true }, 
    coupon: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Coupon",
  default: null, // null = purana/global/free question
},
addedByTeacher: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Teacher",
  default: null,
}
  },
  { timestamps: true }
);

// ⚡ Is specific connection ka use karke model ko compile aur export kiya
export const Question = rowQuestionConnection.model("Question", questionSchema);