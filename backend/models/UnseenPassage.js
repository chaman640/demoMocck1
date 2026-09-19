// models/UnseenPassage.js
//
// 🆕 NAYA — Ek "Unseen Passage" document mein EK passage aur uske SAARE
// jude hue sawaal ek saath rehte hain. Jab mock generate hota hai aur
// blueprint mein "Unseen Passage (Hindi): 5 questions" jaisi entry hoti
// hai, system is collection se EK poora passage (uske saare sawaal
// samet) uठा leta hai — taaki student ko sabhi sawaal usi ek passage ke
// saath, ek block mein milein, alag-alag passage se bikhre hue nahi.
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const passageQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    option1: { type: String, required: true },
    option2: { type: String, required: true },
    option3: { type: String, required: true },
    option4: { type: String, required: true },
    correctOption: { type: Number, required: true, min: 1, max: 4 },
    answerExplain: { type: String, default: "" },
  },
  { _id: true }
);

const unseenPassageSchema = new mongoose.Schema(
  {
    examName: { type: String, required: true, trim: true },
    // Kis blueprint ke liye hai — taaki mock-generation sirf usi
    // blueprint ke passages mein se chune, kisi doosre exam/blueprint
    // ka passage galti se na aa jaaye
    blueprintName: { type: String, required: true, trim: true },
    language: { type: String, enum: ["Hindi", "English"], required: true },
    passageText: { type: String, required: true },
    questions: {
      type: [passageQuestionSchema],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "Passage mein kam se kam ek sawaal hona chahiye",
      },
    },
  },
  { timestamps: true }
);

export default rowQuestionConnection.model("UnseenPassage", unseenPassageSchema);
