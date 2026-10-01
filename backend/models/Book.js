import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    coverImageUrl: { type: String, default: "" },

    type: { type: String, enum: ["digital", "physical"], required: true },
    isFree: { type: Boolean, default: false },
    coinCost: { type: Number, default: 0, min: 0 },

    digitalFileUrl: { type: String, default: "" },
    // Nayi digital books private file hoti hain (sirf app ke reader mein khulti hain)
    digitalFilePublicId: { type: String, default: "" },

    stockQuantity: { type: Number, default: null },

    status: { type: String, enum: ["active", "hidden"], default: "active" },

    createdBy: {
      actorType: { type: String, enum: ["admin", "teacher"], default: "admin" },
      actorId: { type: mongoose.Schema.Types.ObjectId, default: null },
    },
  },
  { timestamps: true }
);

const Book = rowQuestionConnection.model("Book", bookSchema);
export default Book;
