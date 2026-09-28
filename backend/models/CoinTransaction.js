import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const coinTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["test_completion", "streak_bonus", "redeem_book", "admin_adjustment"],
      required: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    note: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

coinTransactionSchema.index({ user: 1, createdAt: -1 });

const CoinTransaction = rowQuestionConnection.model("CoinTransaction", coinTransactionSchema);
export default CoinTransaction;
