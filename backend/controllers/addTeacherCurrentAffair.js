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
      return res.status(400).json({ success: false, message: "Select your active batch first!" });
    }

    const coupon = await Coupon.findById(req.teacher.activeCoupon).select("exam name");
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Active batch not found." });
    }

    const { date, title, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "At least one item is required!" });
    }
    for (const item of items) {
      if (!item.headline || !item.content) {
        return res.status(400).json({ success: false, message: "Every item needs a headline and content!" });
      }
    }

    const finalDate = date || getTodayIST();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(finalDate)) {
      return res.status(400).json({ success: false, message: "Date must be in 'YYYY-MM-DD' format." });
    }

    const saved = await CurrentAffair.findOneAndUpdate(
      { examName: coupon.exam, date: finalDate, coupon: coupon._id },
      { $set: { examName: coupon.exam, date: finalDate, title, items, coupon: coupon._id, addedByTeacher: req.teacher._id } },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(201).json({
      success: true,
      message: `Current affairs for '${finalDate}' saved for batch '${coupon.name}'!`,
      data: saved,
    });
  } catch (error) {
    console.error("addTeacherCurrentAffair error:", error);
    return res.status(500).json({ success: false, message: "Error while saving current affairs." });
  }
};

// GET /teacher/current-affair/:date? — teacher apna batch-wise entry dekh sake (review/edit se pehle)
export const getTeacherCurrentAffair = async (req, res) => {
  try {
    if (!req.teacher.activeCoupon) {
      return res.status(400).json({ success: false, message: "Select your active batch first!" });
    }
    const finalDate = req.params.date || getTodayIST();
    const affair = await CurrentAffair.findOne({ coupon: req.teacher.activeCoupon, date: finalDate });
    return res.status(200).json({ success: true, data: affair || null });
  } catch (error) {
    console.error("getTeacherCurrentAffair error:", error);
    return res.status(500).json({ success: false, message: "Error while fetching." });
  }
};
