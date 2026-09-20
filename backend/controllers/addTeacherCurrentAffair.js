// backend/controllers/addTeacherCurrentAffair.js
//
// 🆕 NAYA — Teacher apne ACTIVE BATCH ke students ke liye current affairs
// daal sakta hai (Admin ke global wale ke ALAG/EXTRA — dono student ko
// saath mein milte hain). examName seedha coupon.exam se liya jaata hai.
import Coupon from "../models/Coupon.js";
import CurrentAffair from "../models/CurrentAffair.js";
import { getTodayIST } from "../utils/dateHelpers.js";

export const addTeacherCurrentAffair = async (req, res) => {
  try {
    if (!req.teacher.activeCoupon) {
      return res.status(400).json({ success: false, message: "Pehle apna active batch select karein!" });
    }

    const coupon = await Coupon.findById(req.teacher.activeCoupon).select("exam name");
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Active batch nahi mila." });
    }

    const { date, title, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Kam se kam ek item zaroori hai!" });
    }
    for (const item of items) {
      if (!item.headline || !item.content) {
        return res.status(400).json({ success: false, message: "Har item mein headline aur content zaroori hai!" });
      }
    }

    const finalDate = date || getTodayIST();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(finalDate)) {
      return res.status(400).json({ success: false, message: "Date format 'YYYY-MM-DD' mein hona chahiye." });
    }

    const saved = await CurrentAffair.findOneAndUpdate(
      { examName: coupon.exam, date: finalDate, coupon: coupon._id },
      { $set: { examName: coupon.exam, date: finalDate, title, items, coupon: coupon._id, addedByTeacher: req.teacher._id } },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(201).json({
      success: true,
      message: `'${coupon.name}' batch ke liye '${finalDate}' current affairs save ho gaye!`,
      data: saved,
    });
  } catch (error) {
    console.error("addTeacherCurrentAffair error:", error);
    return res.status(500).json({ success: false, message: "Current affairs save karte waqt error aaya." });
  }
};

// GET /teacher/current-affair/:date? — teacher apna batch-wise entry dekh sake (review/edit se pehle)
export const getTeacherCurrentAffair = async (req, res) => {
  try {
    if (!req.teacher.activeCoupon) {
      return res.status(400).json({ success: false, message: "Pehle apna active batch select karein!" });
    }
    const finalDate = req.params.date || getTodayIST();
    const affair = await CurrentAffair.findOne({ coupon: req.teacher.activeCoupon, date: finalDate });
    return res.status(200).json({ success: true, data: affair || null });
  } catch (error) {
    console.error("getTeacherCurrentAffair error:", error);
    return res.status(500).json({ success: false, message: "Fetch karte waqt error aaya." });
  }
};
