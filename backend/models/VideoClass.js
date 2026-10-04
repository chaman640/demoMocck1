import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

// One class (lecture) in a batch. The video is a YouTube video/live stream
// (ideally "Unlisted"). After a live class ends, the same video becomes the
// recording. Notes are a regular Note document, so they open in the in-app
// reader and work offline.
const videoClassSchema = new mongoose.Schema(
  {
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },
    folder: { type: mongoose.Schema.Types.ObjectId, ref: "ClassFolder", required: true },
    subjectName: { type: String, required: true, trim: true },
    topicName: { type: String, trim: true, default: "" },

    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, default: "", maxlength: 2000 },

    // "live" = scheduled live class, "recorded" = an already recorded video
    kind: { type: String, enum: ["live", "recorded"], required: true },
    youtubeVideoId: { type: String, default: "" },
    scheduledAt: { type: Date, default: null },
    status: { type: String, enum: ["scheduled", "live", "ended", "cancelled"], default: "scheduled" },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    hidden: { type: Boolean, default: false },

    note: { type: mongoose.Schema.Types.ObjectId, ref: "Note", default: null },

    createdBy: {
      teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
      name: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

videoClassSchema.index({ coupon: 1, folder: 1, createdAt: 1 });
videoClassSchema.index({ coupon: 1, status: 1, scheduledAt: 1 });

export default rowQuestionConnection.model("VideoClass", videoClassSchema);
