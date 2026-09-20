import CurrentAffair from "../models/CurrentAffair.js";
import { getTodayIST } from "../utils/dateHelpers.js";

// 🆕 Ye Admin ka route hai — hamesha GLOBAL (coupon: null) current affair
// banata/update karta hai, poore exam ke liye. Batch-specific wale ab
// Teacher apne "Content" page se, alag controller (addTeacherCurrentAffair)
// se add karta hai.
export const addCurrentAffair = async (req, res) => {
  try {
    const { examName, date, title, items } = req.body;

    if (!examName || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "examName aur kam se kam ek item zaroori hai!",
      });
    }

    for (const item of items) {
      if (!item.headline || !item.content) {
        return res.status(400).json({
          success: false,
          message: "Har item mein headline aur content zaroori hai!",
        });
      }
    }

    const finalDate = date || getTodayIST();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(finalDate)) {
      return res.status(400).json({
        success: false,
        message: "Date format 'YYYY-MM-DD' mein hona chahiye (e.g. 2026-07-16)!",
      });
    }

    // upsert — agar isi din ka GLOBAL entry pehle se hai to update ho
    // jayega, taaki content edit karne ke liye dobara POST karne par
    // duplicate-key error na aaye. "coupon: null" explicitly diya hai
    // taaki galti se kisi batch-specific entry se match/overwrite na ho.
    const saved = await CurrentAffair.findOneAndUpdate(
      { examName, date: finalDate, coupon: null },
      { $set: { examName, date: finalDate, title, items, coupon: null } },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(201).json({
      success: true,
      message: `'${finalDate}' ke liye '${examName}' current affairs save ho gaye!`,
      data: saved,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Current affairs save karte waqt error aaya.",
      error: error.message,
    });
  }
};
