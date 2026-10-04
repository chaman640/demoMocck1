import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

// Doubt box under a class: students ask, teachers answer.
const classDoubtSchema = new mongoose.Schema(
  {
    videoClass: { type: mongoose.Schema.Types.ObjectId, ref: "VideoClass", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, default: "" },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    answer: { type: String, trim: true, default: "", maxlength: 1000 },
    answeredBy: { type: String, default: "" },
    answeredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

classDoubtSchema.index({ videoClass: 1, createdAt: -1 });

export default rowQuestionConnection.model("ClassDoubt", classDoubtSchema);
