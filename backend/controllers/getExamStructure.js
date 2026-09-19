// backend/controllers/getExamStructure.js
//
// 🆕 NAYA — Admin jab question ya unseen-passage add karta hai, subject/
// topic ab TYPE nahi karega, is exam ke Blueprints mein jo already bana
// hai usi mein se CHUNEGA — taaki spelling/spacing mismatch (jo Question
// ko Blueprint se match hone se rok deta hai, aur mock test khaali aa
// jaata hai) hamesha ke liye khatam ho jaaye.
import Blueprint from "../models/bluePrint.js";

export const getExamStructure = async (req, res) => {
  try {
    const { examName } = req.params;
    if (!examName) {
      return res.status(400).json({ success: false, message: "examName zaroori hai." });
    }

    const blueprints = await Blueprint.find({ examName }).select("blueprintName subjects unseenPassages");

    // subjectName -> Set(topicName) — saare blueprints se merge karke
    const subjectMap = {};
    for (const bp of blueprints) {
      for (const s of bp.subjects || []) {
        if (!subjectMap[s.subjectName]) subjectMap[s.subjectName] = new Set();
        for (const t of s.topics || []) {
          if (t.topicName) subjectMap[s.subjectName].add(t.topicName);
        }
      }
    }

    const subjects = Object.entries(subjectMap).map(([subjectName, topicSet]) => ({
      subjectName,
      topics: Array.from(topicSet).sort(),
    }));

    return res.status(200).json({
      success: true,
      data: {
        blueprints: blueprints.map((bp) => ({ blueprintName: bp.blueprintName, hasUnseenPassages: (bp.unseenPassages || []).length > 0 })),
        subjects,
      },
    });
  } catch (error) {
    console.error("getExamStructure error:", error);
    return res.status(500).json({ success: false, message: "Structure fetch karte waqt error aaya." });
  }
};
