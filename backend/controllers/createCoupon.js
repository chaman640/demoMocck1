// controllers/createCoupon.js
// Sirf MAIN TEACHER naya coupon/group bana sakta hai.
import Coupon from "../models/Coupon.js";
import { checkRequestedCode, generateUniqueCode } from "../utils/codeRegistry.js";

export const createCoupon = async (req, res) => {
  try {
    // ─────────────────────────────────────────────
    // STEP 0: Sirf Main Teacher hi coupon bana sakta hai
    // ─────────────────────────────────────────────
    if (req.teacher.role !== "main") {
      return res.status(403).json({
        success: false,
        message: "Sirf Main Teacher hi naya coupon/group bana sakta hai!",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 1: Validation
    // ─────────────────────────────────────────────
    const { name, exam } = req.body;

    if (!name || !exam) {
      return res.status(400).json({
        success: false,
        message: "name aur exam dono zaroori hain!",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 2: Unique code generate karo (collision-safe retry loop)
    // ─────────────────────────────────────────────
    // Teacher apna code khud chun sakta hai (jaise "RAHULSSC"). Na chune to
    // random. Code coupon, promoter aur student referral — teeno mein unique.
    let code;
    if (req.body.code && String(req.body.code).trim()) {
      const result = await checkRequestedCode(req.body.code, { exam });
      if (!result.ok) {
        return res.status(409).json({ success: false, message: result.message, suggestions: result.suggestions || [] });
      }
      code = result.code;
    } else {
      code = await generateUniqueCode("", 8);
    }
    if (!code) {
      return res.status(500).json({
        success: false,
        message: "Coupon code generate karne mein dikkat aa rahi hai, dobara try karein.",
      });
    }

    // Public = koi bhi code se jud sake (YouTube/open batch), Private = sirf list wale.
    // Na bheja to public — naya batch pehle bhi sabke liye khula hi banta tha.
    const visibility = req.body.visibility === "private" ? "private" : "public";

    const newCoupon = new Coupon({
      code,
      name: name.trim(),
      exam: exam.trim(),
      mainTeacher: req.teacher._id,
      visibility,
    });

    await newCoupon.save();

    // ─────────────────────────────────────────────
    // STEP 4: Response
    // ─────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      message: "Coupon/Group successfully ban gaya!",
      data: newCoupon,
    });
  } catch (error) {
    // Agar duplicate-key error aaye (unique index se), rare race-condition case
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Ye coupon code pehle se maujood hai, dobara try karein.",
      });
    }
    console.error("createCoupon error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya coupon banate waqt.",
      error: error.message,
    });
  }
};