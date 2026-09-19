// backend/controllers/manageUnseenPassage.js
import mongoose from "mongoose";
import UnseenPassage from "../models/UnseenPassage.js";
import Blueprint from "../models/bluePrint.js";

// POST /add-unseen-passage  (admin-only)
// Body: { examName, blueprintName, language, passageText, questions: [...] }
export const addUnseenPassage = async (req, res) => {
  try {
    const { examName, blueprintName, language, passageText, questions } = req.body;

    if (!examName || !blueprintName || !language || !passageText || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "examName, blueprintName, language, passageText aur kam se kam ek question zaroori hai.",
      });
    }
    if (!["Hindi", "English"].includes(language)) {
      return res.status(400).json({ success: false, message: "language 'Hindi' ya 'English' hona chahiye." });
    }

    // Blueprint exist karta hai aur usmein isi language ka unseen-passage
    // bucket maujood hai, ye confirm kar lo — taaki galti se kisi aise
    // blueprint pe passage na ban jaaye jise iski zaroorat hi nahi
    const blueprint = await Blueprint.findOne({ examName, blueprintName });
    if (!blueprint) {
      return res.status(404).json({ success: false, message: "Ye blueprint nahi mila." });
    }
    const hasBucket = (blueprint.unseenPassages || []).some((p) => p.language === language);
    if (!hasBucket) {
      return res.status(400).json({
        success: false,
        message: `'${blueprintName}' mein '${language}' Unseen Passage ka bucket hi nahi hai. Pehle blueprint mein ye add karein.`,
      });
    }

    const created = await UnseenPassage.create({
      examName,
      blueprintName,
      language,
      passageText,
      questions,
    });

    return res.status(201).json({ success: true, message: "Unseen Passage add ho gaya!", data: created });
  } catch (error) {
    console.error("addUnseenPassage error:", error);
    return res.status(500).json({ success: false, message: error.message || "Passage add karte waqt error aaya." });
  }
};

// GET /unseen-passages/:examName/:blueprintName  (admin-only)
export const listUnseenPassages = async (req, res) => {
  try {
    const { examName, blueprintName } = req.params;
    const passages = await UnseenPassage.find({ examName, blueprintName }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      data: passages.map((p) => ({
        _id: p._id,
        language: p.language,
        passageText: p.passageText,
        questionCount: p.questions.length,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error("listUnseenPassages error:", error);
    return res.status(500).json({ success: false, message: "List fetch karte waqt error aaya." });
  }
};

// DELETE /unseen-passages/:id  (admin-only)
export const deleteUnseenPassage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }
    const deleted = await UnseenPassage.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Ye passage nahi mila." });
    return res.status(200).json({ success: true, message: "Passage hata diya gaya." });
  } catch (error) {
    console.error("deleteUnseenPassage error:", error);
    return res.status(500).json({ success: false, message: "Delete karte waqt error aaya." });
  }
};
