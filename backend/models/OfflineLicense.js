import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

// Ek device par ek book/note ko offline padhne ki permission.
// expiresAt tak bina internet ke padh sakte hain; online aate hi sync
// isse aage badha deta hai (ya access khatam hone par revoke kar deta hai).
const offlineLicenseSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    deviceId: { type: String, required: true },
    itemType: { type: String, enum: ["book", "note"], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

offlineLicenseSchema.index({ user: 1, deviceId: 1, itemType: 1, itemId: 1 }, { unique: true });

export default rowQuestionConnection.model("OfflineLicense", offlineLicenseSchema);
