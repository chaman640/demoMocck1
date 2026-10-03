import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

// Custom test (practice mode) mein student ne jis sawaal ka "Check Answer"
// dabaya — us waqt ka answer yahan lock ho jaata hai. Submit par yahi
// answer gina jaata hai, taaki sahi answer dekh kar baad mein badla na ja sake.
// Submit hone par is test ke records hata diye jaate hain (retake fresh).
const customTestRevealSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    testId: { type: mongoose.Schema.Types.ObjectId, ref: "CustomTest", required: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    lockedAnswer: { type: String, default: null },
  },
  { timestamps: true }
);

customTestRevealSchema.index({ userId: 1, testId: 1, questionId: 1 }, { unique: true });
// Chhode hue (kabhi submit na hue) attempts 7 din baad apne aap saaf
customTestRevealSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export default rowQuestionConnection.model("CustomTestReveal", customTestRevealSchema);
