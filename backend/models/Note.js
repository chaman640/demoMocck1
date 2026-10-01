import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

// Study notes (PDF). Admin ke notes ek exam ke sabhi students ke liye hote
// hain ("public"); teacher ke notes sirf uske chune hue batches ke liye ("batch").
// File private Cloudinary par rehti hai — student sirf app ke reader mein padhta hai.
const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },

    examName: { type: String, trim: true, default: "" },
    subjectName: { type: String, required: true, trim: true },
    topicName: { type: String, trim: true, default: "" },

    visibility: { type: String, enum: ["public", "batch"], required: true },
    coupons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Coupon" }],

    filePublicId: { type: String, required: true },
    fileBytes: { type: Number, default: 0 },

    status: { type: String, enum: ["active", "hidden"], default: "active" },

    createdBy: {
      actorType: { type: String, enum: ["admin", "teacher"], required: true },
      actorId: { type: mongoose.Schema.Types.ObjectId, default: null },
      name: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

noteSchema.index({ visibility: 1, examName: 1, status: 1 });
noteSchema.index({ coupons: 1, status: 1 });

export default rowQuestionConnection.model("Note", noteSchema);
