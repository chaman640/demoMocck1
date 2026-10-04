// models/CustomTest.js
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const customTestQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: [true, "Question text is required"] },
    questionPhoto: { type: String, default: null },
    option1: { type: String, required: [true, "Option 1 is required"] },
    option2: { type: String, required: [true, "Option 2 is required"] },
    option3: { type: String, required: [true, "Option 3 is required"] },
    option4: { type: String, required: [true, "Option 4 is required"] },
    correctOption: { type: Number, required: [true, "Correct option (1-4) is required"], min: 1, max: 4 },
    answerExplain: { type: String, default: "" },
    // 🆕 NAYA — explanation ke saath photo (jaise diagram/chart wali explanation)
    answerExplainWithPhoto: { type: String, default: null },
    // 🆕 NAYA — optional: ye sawaal pehle kis exam/saal mein pucha ja chuka
    // hai (jaise "UPSSSC PET 2019"). Question ke niche dikhta hai.
    askedIn: { type: String, default: null, trim: true },
    topicName: { type: String, default: "General" },
    subjectName: { type: String, required: true },
  },
  { _id: true } // attempt track karne ke liye har question ki apni _id
);

const customTestSchema = new mongoose.Schema(
  {
    testName: { type: String, required: [true, "Test name is required"], trim: true },
    examName: { type: String, required: true, trim: true, index: true },

    // Hamesha ek specific coupon/group ke liye — Previous Year Paper ke
    // ulta, isme koi "global default" concept nahi hai
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: [true, "A custom test must always be linked to a coupon/group"],
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "The teacher who created it is required"],
    },

    // MVP: simple hai — koi blueprint/quota nahi, jo bhi subject/question
    // teacher daale wahi seedha add ho jata hai (PYQ ke shell-fill jaisa
    // complex nahi hai, jaisa spec point 4 mein bola gaya hai)
    subjects: {
      type: [
        {
          subjectName: { type: String, required: true },
          questions: [customTestQuestionSchema],
        },
      ],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "There must be questions for at least one subject",
      },
    },

    marksPerQuestion: { type: Number, required: true, default: 1 },
    negativeMarking: { type: Number, required: true, default: 0 },
    durationMinutes: { type: Number, required: [true, "Duration is required"] },

    totalQuestions: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

customTestSchema.pre("save", function (next) {
  this.totalQuestions = this.subjects.reduce(
    (sum, subj) => sum + (subj.questions?.length || 0),
    0
  );
  next();
});

const CustomTest = rowQuestionConnection.model("CustomTest", customTestSchema);
export default CustomTest;
