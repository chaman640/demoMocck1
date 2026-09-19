// models/Blueprint.js
//
// 🆕 REDESIGN
//
// PEHLE: har subject ke andar "importantTopics" (sirf naam ki list) hota
// tha, aur mock-generation apne aap decide karta tha kis topic se kitne
// questions lene hain (weak-topic-priority ke through) — max 3 per topic
// ki hardcoded limit ke saath. Isse do dikkatein thi:
//   1. Agar subject ko 30 questions chahiye lekin sirf 4 topics hain,
//      to 4×3=12 hi max mil sakte the — kabhi 30 nahi bante.
//   2. Unseen Passage jaise sawaal (jahan 5 sawaal EK passage se aane
//      chahiye) ka koi tareeka nahi tha — har sawaal alag-alag passage
//      se aa jaata tha.
//
// AB: har topic ka apna EXACT questionCount hota hai — teacher/admin
// khud tay karte hain "is topic se itne sawaal chahiye", koi hardcoded
// limit nahi. Aur "Unseen Passage" ek alag, khud ka bucket hai jo poore
// passage (sabhi sawaal ek saath) ko as-a-whole include karta hai.
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const topicSchema = new mongoose.Schema(
  {
    topicName: { type: String, required: true, trim: true },
    // 🆕 Is topic se EXACTLY kitne questions lene hain (pehle sirf naam
    // hota tha, count nahi)
    questionCount: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const subjectSchema = new mongoose.Schema(
  {
    subjectName: { type: String, required: true, trim: true },
    questionCount: { type: Number, required: true }, // = sum(topics.questionCount)
    topics: {
      type: [topicSchema],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "Har subject mein kam se kam ek topic hona chahiye",
      },
    },
  },
  { _id: false }
);

// 🆕 NAYA — Unseen Passage bucket. Hindi aur English dono ke liye alag
// entry ho sakti hai. "questionCount" batata hai is language mein kitne
// passage-based questions chahiye (asli sawaal UnseenPassage collection
// se aayenge, poore ek passage ke — is model mein sirf "kitne chahiye"
// bataya jaata hai).
const unseenPassageBucketSchema = new mongoose.Schema(
  {
    language: { type: String, enum: ["Hindi", "English"], required: true },
    questionCount: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const blueprintSchema = new mongoose.Schema(
  {
    blueprintName: {
      type: String,
      required: [true, "Blueprint ka naam zaroori hai"],
      trim: true,
    },
    examName: {
      type: String,
      required: [true, "Kis exam ka blueprint hai, ye batana zaroori hai"],
      trim: true,
    },
    totalQuestions: {
      type: Number,
      required: [true, "Total questions batana zaroori hai"],
    },
    marksPerQuestion: {
      type: Number,
      required: [true, "Marks per question dena zaroori hai"],
    },
    negativeMarking: {
      type: Number,
      required: [true, "Negative marking batana zaroori hai. (0 likhein agar nahi hai)"],
      default: 0,
    },
    durationMinutes: {
      type: Number,
      default: 0,
    },
    subjects: {
      type: [subjectSchema],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "Kam se kam ek subject hona chahiye",
      },
    },
    // 🆕 Optional — jin exams/blueprints mein Unseen Passage nahi hai,
    // wahan ye khaali chhod sakte hain
    unseenPassages: {
      type: [unseenPassageBucketSchema],
      default: [],
    },
    mockType: {
      type: String,
      enum: ["Mini", "Full"],
      default: "Full",
    },
  },
  { timestamps: true }
);

// 🆕 Hierarchy check — save hone se pehle khud verify karta hai ki
// numbers sahi se jud rahe hain, taaki galat blueprint kabhi save hi na ho:
//   totalQuestions = sum(subjects.questionCount) + sum(unseenPassages.questionCount)
//   har subject.questionCount = sum(uske topics.questionCount)
blueprintSchema.pre("validate", function (next) {
  for (const subject of this.subjects || []) {
    const topicsSum = (subject.topics || []).reduce((sum, t) => sum + t.questionCount, 0);
    if (topicsSum !== subject.questionCount) {
      return next(
        new Error(
          `Subject '${subject.subjectName}' ka questionCount (${subject.questionCount}) uske topics ke total (${topicsSum}) se match nahi karta.`
        )
      );
    }
  }

  const subjectsSum = (this.subjects || []).reduce((sum, s) => sum + s.questionCount, 0);
  const passagesSum = (this.unseenPassages || []).reduce((sum, p) => sum + p.questionCount, 0);
  const grandTotal = subjectsSum + passagesSum;

  if (grandTotal !== this.totalQuestions) {
    return next(
      new Error(
        `totalQuestions (${this.totalQuestions}) subjects (${subjectsSum}) + unseen passages (${passagesSum}) = ${grandTotal} se match nahi karta.`
      )
    );
  }

  next();
});

export default rowQuestionConnection.model("Blueprint", blueprintSchema);
