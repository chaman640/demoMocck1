import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const bookRedemptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },

    bookSnapshot: {
      title: { type: String, required: true },
      type: { type: String, enum: ["digital", "physical"], required: true },
      coverImageUrl: { type: String, default: "" },
    },

    coinsSpent: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: ["delivered", "pending", "shipped"],
      default: "pending",
    },

    shippingAddress: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      addressLine: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },

    digitalFileUrl: { type: String, default: "" },
    trackingInfo: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

bookRedemptionSchema.index({ user: 1, book: 1 }, { unique: true });
bookRedemptionSchema.index({ createdAt: -1 });

const BookRedemption = rowQuestionConnection.model("BookRedemption", bookRedemptionSchema);
export default BookRedemption;
