// models/Blueprint.js
//
// 🆕 REDESIGN v3 — Unseen Passage ab subject ke ANDAR ek topic ki tarah
// hai, alag top-level bucket nahi. Jaise: "Hindi & English" subject mein
// topics ho sakte hain — "General Hindi"(10), "General English"(10), aur
// "Unseen Passage (Hindi)"(5) — teeno isi EK subject/tab ke andar. Isse
// student ko sawaal usi subject ke flow mein milte hain (jaise 16-20),
// alag tab mein nahi.
//
// v2 mein ye ek alag top-level "unseenPassages" array tha — usse hata
// diya gaya hai, ab topic-level flag (isUnseenPassage + passageLanguage)
// se kaam chalta hai.
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const topicSchema = new mongoose.Schema(
  {
    topicName: { type: String, required: true, trim: true },
    questionCount: { type: Number, required: true, min: 1 },
    // 🆕 Agar ye topic Unseen Passage hai, to sawaal Question pool se
    // nahi, UnseenPassage collection se (ek poore passage ke roop mein)
    // aayenge — aur mock mein ye sab hamesha isi subject ke andar,
    // ek saath (contiguous) rahenge, shuffle nahi honge.
    isUnseenPassage: { type: Boolean, default: false },
    passageLanguage: { type: String, enum: ["Hindi", "English", null], default: null },
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
        message: "Every subject must have at least one topic",
      },
    },
  },
  { _id: false }
);

const blueprintSchema = new mongoose.Schema(
  {
    blueprintName: {
      type: String,
      required: [true, "Blueprint name is required"],
      trim: true,
    },
    examName: {
      type: String,
      required: [true, "The exam this blueprint is for is required"],
      trim: true,
    },
    totalQuestions: {
      type: Number,
      required: [true, "Total questions is required"],
    },
    marksPerQuestion: {
      type: Number,
      required: [true, "Marks per question is required"],
    },
    negativeMarking: {
      type: Number,
      required: [true, "Negative marking is required. (Enter 0 if there is none)"],
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
        message: "There must be at least one subject",
      },
    },
    mockType: {
      type: String,
      enum: ["Mini", "Full"],
      default: "Full",
    },
  },
  { timestamps: true }
);

// 🆕 Hierarchy check — ab simple ho gaya hai kyunki Unseen Passage bhi
// ek normal topic hi hai (uska questionCount bhi topics ke sum mein
// khud-ba-khud shaamil ho jaata hai):
//   totalQuestions = sum(subjects.questionCount)
//   har subject.questionCount = sum(uske topics.questionCount)
blueprintSchema.pre("validate", function (next) {
  for (const subject of this.subjects || []) {
    const topicsSum = (subject.topics || []).reduce((sum, t) => sum + t.questionCount, 0);
    if (topicsSum !== subject.questionCount) {
      return next(
        new Error(
          `Subject '${subject.subjectName}' questionCount (${subject.questionCount}) does not match the total of its topics (${topicsSum}).`
        )
      );
    }
    for (const topic of subject.topics || []) {
      if (topic.isUnseenPassage && !topic.passageLanguage) {
        return next(new Error(`Topic '${topic.topicName}' is an Unseen Passage but its language (Hindi/English) is not set.`));
      }
    }
  }

  const subjectsSum = (this.subjects || []).reduce((sum, s) => sum + s.questionCount, 0);
  if (subjectsSum !== this.totalQuestions) {
    return next(
      new Error(`totalQuestions (${this.totalQuestions}) does not match the subjects total (${subjectsSum}).`)
    );
  }

  next();
});

export default rowQuestionConnection.model("Blueprint", blueprintSchema);
