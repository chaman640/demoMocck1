// models/User.js
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name zaroori hai"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email zaroori hai"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number zaroori hai"],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password zaroori hai"],
      minlength: [6, "Password kam se kam 6 characters ka hona chahiye"],
    },
    address: {
      type: String,
      required: [true, "Address zaroori hai"],
      trim: true,
    },
    exam: {
      type: String,
      required: [true, "Exam ka naam zaroori hai"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = rowQuestionConnection.model("User", userSchema);

export default User;