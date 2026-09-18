// backend/models/AllowedStudent.js
//
// 🆕 NAYA — Main Teacher apne batch (coupon) ke liye students ko PEHLE se
// (naam + phone/email ke saath) add kar sakta hai. Jab tak koi entry na
// ho, batch pehle jaisa "open" rehta hai (koi bhi valid coupon code se
// join kar sakta hai). Jaise hi teacher kam se kam ek student add karta
// hai, wo batch "invite-only" ban jaata hai — sirf list mein maujood
// phone/email hi join kar payenge.
import mongoose from "mongoose";
import { rowQuestionConnection } from "../config/rowQuestion.js";

const allowedStudentSchema = new mongoose.Schema(
  {
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true, index: true },
    name: { type: String, trim: true, default: null },
    phone: { type: String, trim: true, default: null, index: true },
    email: { type: String, trim: true, lowercase: true, default: null, index: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    // Jab koi student is entry se match karke actually join kar leta hai
    matchedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    matchedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Kam se kam ek (phone ya email) hona zaroori hai
allowedStudentSchema.pre("validate", function (next) {
  if (!this.phone && !this.email) {
    return next(new Error("Phone ya email mein se ek zaroori hai."));
  }
  next();
});

export default rowQuestionConnection.model("AllowedStudent", allowedStudentSchema);
