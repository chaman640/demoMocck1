// models/PreviousYearTest.js
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

// ─────────────────────────────────────────────
// Ek question ka poora data — admin khud sab kuchh
// yahin manually daalega. Koi Question pool se link
// nahi hai, kyunki ye REAL purane paper ke EXACT
// sawaal hain, permanently fixed.
// ─────────────────────────────────────────────
const pyqQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: [true, "Question likhna zaroori hai"] },
    questionPhoto: { type: String, default: null },
    option1: { type: String, required: [true, "Option 1 zaroori hai"] },
    option2: { type: String, required: [true, "Option 2 zaroori hai"] },
    option3: { type: String, required: [true, "Option 3 zaroori hai"] },
    option4: { type: String, required: [true, "Option 4 zaroori hai"] },
    correctOption: {
      type: Number,
      required: [true, "Correct option (1-4) zaroori hai"],
      min: 1,
      max: 4,
    },
    answerExplain: { type: String, default: "" },
    answerExplainWithPhoto: { type: String, default: null },
    topicName: { type: String, default: "General" },
    subjectName: { type: String, required: [true, "Subject ka naam zaroori hai"] },
    questionNumber: { type: Number },
  },
  { _id: true } // har question ki apni _id — attempt track karne ke liye
);

const pyqSubjectSchema = new mongoose.Schema(
  {
    subjectName: { type: String, required: true },
    questions: [pyqQuestionSchema],
  },
  { _id: false }
);

const previousYearTestSchema = new mongoose.Schema(
  {
    // Kis exam ka hai — "UP Police Constable", "SSC Gd" waghera
    examName: {
      type: String,
      required: [true, "Exam ka naam zaroori hai"],
      trim: true,
      index: true,
    },

    // Display naam — e.g. "UP Police Constable 2018"
    testName: {
      type: String,
      required: [true, "Test ka naam zaroori hai"],
      trim: true,
    },

    // Kis saal ka paper hai — home page pe isi se sort/dikhega
    year: {
      type: Number,
      required: [true, "Saal (year) batana zaroori hai"],
    },

    // Optional extra info — jaise "Shift 1", "Re-exam", "Tier 1"
    description: {
      type: String,
      trim: true,
      default: "",
    },

    subjects: {
      type: [pyqSubjectSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "Kam se kam ek subject ke questions hone chahiye",
      },
    },

    marksPerQuestion: { type: Number, required: true, default: 1 },
    negativeMarking: { type: Number, required: true, default: 0 },
    durationMinutes: {
      type: Number,
      required: [true, "Duration (minutes) batana zaroori hai"],
    },

    // Auto-calculate hoga save karte waqt
    totalQuestions: { type: Number, default: 0 },

    // Admin isse false karke test ko user se hide kar sakta hai
    // bina delete kiye (agar galti se draft publish ho jaaye)
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Save hone se pehle totalQuestions auto-calculate kar do
previousYearTestSchema.pre("save", function (next) {
  this.totalQuestions = this.subjects.reduce(
    (sum, subj) => sum + (subj.questions?.length || 0),
    0
  );
  next();
});

const PreviousYearTest = rowQuestionConnection.model(
  "PreviousYearTest",
  previousYearTestSchema
);

export default PreviousYearTest;