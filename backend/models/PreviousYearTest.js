// models/PreviousYearTest.js
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

// ─────────────────────────────────────────────
// Ek question ka poora data — admin/teacher khud sab kuchh
// manually daalega. Koi Question pool se link nahi hai, kyunki
// ye REAL purane paper ke EXACT sawaal hain, permanently fixed.
// ─────────────────────────────────────────────
const pyqQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: [true, "Question text is required"] },
    questionPhoto: { type: String, default: null },
    option1: { type: String, required: [true, "Option 1 is required"] },
    option2: { type: String, required: [true, "Option 2 is required"] },
    option3: { type: String, required: [true, "Option 3 is required"] },
    option4: { type: String, required: [true, "Option 4 is required"] },
    correctOption: {
      type: Number,
      required: [true, "Correct option (1-4) is required"],
      min: 1,
      max: 4,
    },
    answerExplain: { type: String, default: "" },
    answerExplainWithPhoto: { type: String, default: null },
    topicName: { type: String, default: "General" },
    subjectName: { type: String, required: [true, "Subject name is required"] },
    questionNumber: { type: Number },
  },
  { _id: true } // har question ki apni _id — attempt track karne ke liye
);

const pyqSubjectSchema = new mongoose.Schema(
  {
    subjectName: { type: String, required: true },
    questions: [pyqQuestionSchema],
    // 👇 NAYA: sirf blueprint-shell (teacher-created) papers ke liye
    // meaningful — batata hai ki is subject ka quota poora bhar gaya
    filled: { type: Boolean, default: false },
  },
  { _id: false }
);

const previousYearTestSchema = new mongoose.Schema(
  {
    examName: {
      type: String,
      required: [true, "Exam name is required"],
      trim: true,
      index: true,
    },
    testName: {
      type: String,
      required: [true, "Test name is required"],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, "Year is required"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },

    subjects: {
      type: [pyqSubjectSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "There must be questions for at least one subject",
      },
    },

    marksPerQuestion: { type: Number, required: true, default: 1 },
    negativeMarking: { type: Number, required: true, default: 0 },
    durationMinutes: {
      type: Number,
      required: [true, "Duration (minutes) is required"],
    },

    totalQuestions: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    // ─────────────────────────────────────────────
    // 👇 NAYA: Teacher-section — Blueprint-Shell model
    // ─────────────────────────────────────────────

    // null = global default paper (sabhi students ko dikhega, jab
    // unke coupon-specific papers khatam ho jaayein — jaisa spec point
    // 3.5 mein hai). Non-null = specific coupon/group ke liye bana
    // teacher-created paper.
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
      index: true,
    },

    // Shell kis Main Teacher ne banaya (global admin papers ke liye null)
    createdByTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
    },

    // Sirf teacher-created shell papers mein use hota hai — kis subject
    // ke kitne questions target hain. Global admin papers ke liye khaali []
    blueprint: {
      type: [
        {
          subjectName: { type: String, required: true },
          questionCount: { type: Number, required: true },
        },
      ],
      default: [],
      _id: false,
    },

    // Global papers hamesha "complete" (admin ek-sath sab daalta hai,
    // koi incremental-fill concept nahi). Teacher-created shell papers
    // "draft" se shuru hote hain, jab tak blueprint ke saare subjects
    // ka quota poora na bhar jaaye.
    status: {
      type: String,
      enum: ["draft", "complete"],
      default: "complete",
    },
  },
  { timestamps: true }
);

// Save hone se pehle totalQuestions auto-calculate karo. Agar blueprint-shell
// wala paper hai (blueprint.length > 0), to per-subject "filled" aur poore
// paper ka "status" bhi yahin calculate ho jata hai.
previousYearTestSchema.pre("save", function (next) {
  this.totalQuestions = this.subjects.reduce(
    (sum, subj) => sum + (subj.questions?.length || 0),
    0
  );

  if (this.blueprint && this.blueprint.length > 0) {
    let allFilled = true;

    for (const bp of this.blueprint) {
      const subj = this.subjects.find((s) => s.subjectName === bp.subjectName);
      const filledCount = subj ? subj.questions.length : 0;
      const isFilled = filledCount >= bp.questionCount;

      if (subj) subj.filled = isFilled;
      if (!isFilled) allFilled = false;
    }

    this.status = allFilled ? "complete" : "draft";
  }

  next();
});

const PreviousYearTest = rowQuestionConnection.model(
  "PreviousYearTest",
  previousYearTestSchema
);

export default PreviousYearTest;