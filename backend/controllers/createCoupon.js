// controllers/createCoupon.js
// Sirf MAIN TEACHER naya coupon/group bana sakta hai.
import Coupon from "../models/Coupon.js";

// ─────────────────────────────────────────────
// HELPER: Unique coupon code generate karo
// createChallenge.js ke generateChallengeCode() jaisa hi pattern —
// confusing chars (0,O,1,I) hataye taaki student aasaani se type kar sake
// ─────────────────────────────────────────────
const generateCouponCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

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
    let code;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      code = generateCouponCode();
      const existing = await Coupon.findOne({ code });
      if (!existing) isUnique = true;
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: "Coupon code generate karne mein dikkat aa rahi hai, dobara try karein.",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 3: Coupon save karo — mainTeacher hamesha logged-in teacher hi hoga
    // ─────────────────────────────────────────────
    const newCoupon = new Coupon({
      code,
      name: name.trim(),
      exam: exam.trim(),
      mainTeacher: req.teacher._id,
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