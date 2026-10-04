import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

// One row per (class, student): when they joined, whether they watched it
// live, how long they watched, and where to resume.
const classAttendanceSchema = new mongoose.Schema(
  {
    videoClass: { type: mongoose.Schema.Types.ObjectId, ref: "VideoClass", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    firstJoinedAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    joinedLive: { type: Boolean, default: false },
    watchSeconds: { type: Number, default: 0 },
    lastPosition: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

classAttendanceSchema.index({ videoClass: 1, user: 1 }, { unique: true });
classAttendanceSchema.index({ user: 1, lastSeenAt: -1 });

export default rowQuestionConnection.model("ClassAttendance", classAttendanceSchema);
