// controllers/getQuestionMeta.js
import { Question } from "../models/rowQuestionSchema.js";

// Exam ke andar kaunse subjects hain, aur har subject mein kaunse topics —
// Question Review page pe filter pills banane ke liye (ek hi call mein sab mil jaata hai)
export const getQuestionMeta = async (req, res) => {
  try {
    const { examName } = req.params;

    if (!examName) {
      return res.status(400).json({ success: false, message: "examName zaroori hai!" });
    }

    const docs = await Question.find({ examName: { $in: [examName] } }).select(
      "subjectName topicName"
    );

    if (docs.length === 0) {
      return res.status(200).json({ success: true, data: { subjects: [] } });
    }

    const subjectMap = {};
    for (const doc of docs) {
      const subj = doc.subjectName;
      if (!subjectMap[subj]) {
        subjectMap[subj] = { topics: new Set(), count: 0 };
      }
      subjectMap[subj].topics.add(doc.topicName);
      subjectMap[subj].count++;
    }

    const subjects = Object.keys(subjectMap)
      .sort()
      .map((subjectName) => ({
        subjectName,
        totalQuestions: subjectMap[subjectName].count,
        topics: Array.from(subjectMap[subjectName].topics).sort(),
      }));

    return res.status(200).json({ success: true, data: { subjects } });
  } catch (error) {
    console.error("getQuestionMeta error:", error);
    return res.status(500).json({
      success: false,
      message: "Question meta fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};