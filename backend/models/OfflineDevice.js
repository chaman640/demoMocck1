import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

// Wo phone/browser jin par student ne books/notes offline save kiye hain.
// Ek account par ek waqt mein MAX_OFFLINE_DEVICES (2) active device.
const offlineDeviceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    deviceId: { type: String, required: true },
    label: { type: String, trim: true, default: "" },
    active: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: Date.now },
    removedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

offlineDeviceSchema.index({ user: 1, deviceId: 1 }, { unique: true });

export default rowQuestionConnection.model("OfflineDevice", offlineDeviceSchema);
