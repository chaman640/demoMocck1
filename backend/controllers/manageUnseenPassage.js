// backend/controllers/manageUnseenPassage.js
import mongoose from "mongoose";
import UnseenPassage from "../models/UnseenPassage.js";
import Blueprint from "../models/bluePrint.js";

// POST /add-unseen-passage  (admin-only)
// Body: { examName, subjectName, topicName, language, passageText, questions: [...] }
export const addUnseenPassage = async (req, res) => {
  try {
    const { examName, subjectName, topicName, language, passageText, questions } = req.body;

    if (!examName || !subjectName || !topicName || !language || !passageText || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "examName, subjectName, topicName, language, passageText and at least one question are required.",
      });
    }
    if (!["Hindi", "English"].includes(language)) {
      return res.status(400).json({ success: false, message: "language must be 'Hindi' or 'English'." });
    }

    // 🆕 Confirm karo ki kisi Blueprint mein isi exam ke is subject ke
    // andar ye topic wakai "Unseen Passage" ke roop mein bana hai —
    // taaki galti se kisi normal topic pe passage-content na chadh jaaye
    const matchingBlueprint = await Blueprint.findOne({
      examName,
      subjects: {
        $elemMatch: {
          subjectName,
          topics: { $elemMatch: { topicName, isUnseenPassage: true, passageLanguage: language } },
        },
      },
    });

    if (!matchingBlueprint) {
      return res.status(400).json({
        success: false,
        message: `No Blueprint found with an Unseen Passage topic '${topicName}' (${language}) inside subject '${subjectName}' for '${examName}'. Create this topic in the Blueprint first.`,
      });
    }

    const created = await UnseenPassage.create({ examName, subjectName, topicName, language, passageText, questions });

    return res.status(201).json({ success: true, message: "Unseen Passage added!", data: created });
  } catch (error) {
    console.error("addUnseenPassage error:", error);
    return res.status(500).json({ success: false, message: error.message || "Error while adding the passage." });
  }
};

// GET /unseen-passages/:examName/:subjectName/:topicName  (admin-only)
export const listUnseenPassages = async (req, res) => {
  try {
    const { examName, subjectName, topicName } = req.params;
    const passages = await UnseenPassage.find({ examName, subjectName, topicName }).sort({ createdAt: -1 });
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
    return res.status(500).json({ success: false, message: "Error while fetching the list." });
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
    if (!deleted) return res.status(404).json({ success: false, message: "Passage not found." });
    return res.status(200).json({ success: true, message: "Passage removed." });
  } catch (error) {
    console.error("deleteUnseenPassage error:", error);
    return res.status(500).json({ success: false, message: "Error while deleting." });
  }
};
