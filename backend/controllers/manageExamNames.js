// backend/controllers/manageExamNames.js
//
// 🆕 NAYA — Admin Panel se exam names manage karne ke liye. Public
// signup/dropdown "/allExamName" abhi bhi wahi hai (koi change nahi),
// ye teen routes sirf ADMIN ke liye hain.
import mongoose from "mongoose";
import ExamName from "../models/ExamName.js";

// GET /admin/exam-names — list with _id (delete button ke liye chahiye)
export const listExamNamesAdmin = async (req, res) => {
  try {
    const docs = await ExamName.find().sort({ name: 1 });
    return res.status(200).json({
      success: true,
      data: docs.map((d) => ({ _id: d._id, name: d.name })),
    });
  } catch (error) {
    console.error("listExamNamesAdmin error:", error);
    return res.status(500).json({ success: false, message: "Exam list fetch karte waqt error aaya." });
  }
};

// POST /admin/exam-names  { name }
export const addExamName = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: "Exam ka naam dalein!" });
    }

    const trimmed = String(name).trim();

    const exists = await ExamName.findOne({ name: { $regex: `^${trimmed}$`, $options: "i" } });
    if (exists) {
      return res.status(409).json({ success: false, message: "Ye exam pehle se list mein hai!" });
    }

    const created = await ExamName.create({ name: trimmed });
    return res.status(201).json({
      success: true,
      message: `'${trimmed}' add ho gaya!`,
      data: { _id: created._id, name: created.name },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Ye exam pehle se list mein hai!" });
    }
    console.error("addExamName error:", error);
    return res.status(500).json({ success: false, message: "Exam add karte waqt error aaya." });
  }
};

// DELETE /admin/exam-names/:id
export const deleteExamName = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const deleted = await ExamName.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Ye exam nahi mila." });
    }

    return res.status(200).json({ success: true, message: `'${deleted.name}' hata diya gaya.` });
  } catch (error) {
    console.error("deleteExamName error:", error);
    return res.status(500).json({ success: false, message: "Exam delete karte waqt error aaya." });
  }
};
