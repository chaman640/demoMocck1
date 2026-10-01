import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

// Device hatane ka record — taaki koi baar-baar device hata kar ek hi
// account ko bahut saare phones par na chalaye.
const offlineDeviceRemovalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    deviceId: { type: String, required: true },
  },
  { timestamps: true }
);

export default rowQuestionConnection.model("OfflineDeviceRemoval", offlineDeviceRemovalSchema);
