import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

// Folders for video classes inside a batch: Subject → Topic.
// A subject folder has parent = null; a topic folder sits inside a subject folder.
// subjectName is stored on both levels so sub-teacher permission checks are one lookup.
const classFolderSchema = new mongoose.Schema(
  {
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },
    kind: { type: String, enum: ["subject", "topic"], required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "ClassFolder", default: null },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    subjectName: { type: String, required: true, trim: true },
    createdBy: {
      teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
      name: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

classFolderSchema.index({ coupon: 1, parent: 1, name: 1 });

export default rowQuestionConnection.model("ClassFolder", classFolderSchema);
