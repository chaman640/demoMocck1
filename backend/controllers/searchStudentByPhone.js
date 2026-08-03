// controllers/searchStudentByPhone.js
// Teacher apne active-coupon ke andar student ko phone se search karta hai.
// SIRF wahi students milenge jinka activeCoupon abhi teacher ke activeCoupon
// se match karta hai — kisi doosre teacher ke students kabhi nahi dikhenge.
import User from "../models/User.js";

export const searchStudentByPhone = async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone || phone.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Search ke liye kam se kam 3 digit ka phone number dein.",
      });
    }

    if (!req.teacher.activeCoupon) {
      return res.status(400).json({
        success: false,
        message: "Pehle apna active group/coupon select karein (switch-active-coupon se).",
      });
    }

    // ─────────────────────────────────────────────
    // STRICT PRIVACY RULE: sirf isi coupon ke students —
    // partial match allow karte hain (regex) taaki teacher poora
    // number yaad na rakhna pade, lekin scope hamesha apne coupon tak
    // ─────────────────────────────────────────────
    const students = await User.find({
      activeCoupon: req.teacher.activeCoupon,
      phone: { $regex: phone.trim(), $options: "i" },
    })
      .select("name phone exam")
      .limit(20);

    return res.status(200).json({
      success: true,
      totalFound: students.length,
      data: students,
    });
  } catch (error) {
    console.error("searchStudentByPhone error:", error);
    return res.status(500).json({
      success: false,
      message: "Student search karte waqt error aaya.",
      error: error.message,
    });
  }
};