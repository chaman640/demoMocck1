// models/UnseenPassage.js
//
// 🆕 v2 — Ab examName + subjectName + topicName se link hota hai (bilkul
// regular Question pool jaisa), blueprintName se nahi. Isse ek passage
// Full Mock aur Mini Mock dono mein use ho sakta hai, jab tak dono ke
// blueprint mein wahi subjectName+topicName ho ("Unseen Passage (Hindi)"
// jaisa) — bilkul jaise regular questions kaam karte hain.
//
// Ek document mein EK passage aur uske SAARE jude hue sawaal ek saath
// rehte hain. Jab mock generate hota hai aur kisi subject ke andar
// "Unseen Passage (Hindi)" naam ka topic hota hai, system is collection
// se EK poora passage (uske saare sawaal samet) uठा leta hai — taaki
// student ko sabhi sawaal usi ek passage ke saath, ek block mein milein.
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
    // 🆕 Blueprint ke subject/topic ke EXACT naam se match — jaise
    // subjectName="Hindi & English", topicName="Unseen Passage (Hindi)"
    subjectName: { type: String, required: true, trim: true },
    topicName: { type: String, required: true, trim: true },
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
