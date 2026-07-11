// models/Blueprint.js
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js"; // Aapka shared connection

const blueprintSchema = new mongoose.Schema(
  {
    // Mock Test ka naam (e.g., "UP Police Constable Full Mock" ya "Hindi Mini Mock")
    blueprintName: {
      type: String,
      required: [true, "Blueprint ka naam zaroori hai"],
      trim: true,
    },
    examName: {
      type: String, 
      required: [true, "Kis exam ka blueprint hai, ye batana zaroori hai (e.g., UP Constable)"],
      trim: true,
    },
    // Total Questions
    totalQuestions: {
      type: Number,
      required: [true, "Total questions batana zaroori hai"],
    },

    // Har sahi jawab ke liye kitne marks milenge
    marksPerQuestion: {
      type: Number,
      required: [true, "Marks per question dena zaroori hai"],
    },

    // Negative marking (e.g., 0.5 ya 0.25)
    negativeMarking: {
      type: Number,
      required: [true, "Negative marking batana zaroori hai. (0 likhein agar nahi hai)"],
      default: 0,
    },
    durationMinutes: {
     type: Number,
     default: 0, // 0 ka matlab "auto-calculate karo"
    },

    // Yeh array aapko Mini aur Full mock dono banane me madad karega
    subjects: [
      {
        subjectName: {
          type: String, // e.g., "Hindi", "Maths", "Reasoning"
          required: true,
        },
        questionCount: {
          type: Number, // Is subject se kitne questions aayenge
          required: true,
        },
        importantTopics: [ // 👈 YAHAN IMPORTANT TOPICS ADD KIYA HAI
          { type: String }
        ]
      }
    ],

    // Yeh field optional hai, bas aasani ke liye (Mini ya Full)
    mockType: {
      type: String,
      enum: ["Mini", "Full"], 
      default: "Full",
    }
  },
  {
    timestamps: true, // Kab banaya gaya yeh blueprint, save ho jayega
  }
);

// MOCKTEST database ke andar 'blueprints' naam ka collection ban jayega
const Blueprint = rowQuestionConnection.model("Blueprint", blueprintSchema);

export default Blueprint;