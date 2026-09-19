// backend/controllers/getExamStructure.js
//
// 🆕 NAYA — Admin jab question ya unseen-passage add karta hai, subject/
// topic ab TYPE nahi karega, is exam ke Blueprints mein jo already bana
// hai usi mein se CHUNEGA — taaki spelling/spacing mismatch (jo Question
// ko Blueprint se match hone se rok deta hai, aur mock test khaali aa
// jaata hai) hamesha ke liye khatam ho jaaye.
//
// 🆕 v2 — har topic ke saath ab `isUnseenPassage`/`passageLanguage` bhi
// aata hai, taaki "Unseen Passage Add Karein" form sirf un topics ko
// dikha sake jo wakai passage-type hain.
import Blueprint from "../models/bluePrint.js";

export const getExamStructure = async (req, res) => {
  try {
    const { examName } = req.params;
    if (!examName) {
      return res.status(400).json({ success: false, message: "examName zaroori hai." });
    }

    const blueprints = await Blueprint.find({ examName }).select("blueprintName subjects");

    // subjectName -> topicName -> topic-info — saare blueprints se merge karke
    const subjectMap = {};
    for (const bp of blueprints) {
      for (const s of bp.subjects || []) {
        if (!subjectMap[s.subjectName]) subjectMap[s.subjectName] = {};
        for (const t of s.topics || []) {
          if (!t.topicName) continue;
          subjectMap[s.subjectName][t.topicName] = {
            topicName: t.topicName,
            isUnseenPassage: !!t.isUnseenPassage,
            passageLanguage: t.passageLanguage || null,
          };
        }
      }
    }

    const subjects = Object.entries(subjectMap).map(([subjectName, topicsObj]) => ({
      subjectName,
      topics: Object.values(topicsObj).sort((a, b) => a.topicName.localeCompare(b.topicName)),
    }));

    return res.status(200).json({
      success: true,
      data: {
        blueprints: blueprints.map((bp) => ({ blueprintName: bp.blueprintName })),
        subjects,
      },
    });
  } catch (error) {
    console.error("getExamStructure error:", error);
    return res.status(500).json({ success: false, message: "Structure fetch karte waqt error aaya." });
  }
};
