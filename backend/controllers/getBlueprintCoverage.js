// backend/controllers/getBlueprintCoverage.js
//
// 🆕 NAYA — "Blueprint Coverage Check". Blueprint mein har topic ko kitne
// questions chahiye (declared) vs actual Question Bank mein kitne
// maujood hain (global pool) — side by side dikhata hai, taaki admin ko
// turant pata chal jaaye kaunse topics adhoore hain, bina mock generate
// karke guess kiye.
import Blueprint from "../models/bluePrint.js";
import { Question } from "../models/rowQuestionSchema.js";
import UnseenPassage from "../models/UnseenPassage.js";

export const getBlueprintCoverage = async (req, res) => {
  try {
    const { examName, blueprintName } = req.params;
    const blueprint = await Blueprint.findOne({ examName, blueprintName });
    if (!blueprint) {
      return res.status(404).json({ success: false, message: "Ye blueprint nahi mila." });
    }

    const subjectsReport = [];
    let totalNeeded = 0;
    let totalAvailable = 0; // available ko needed se cap karke (extra questions "bonus" nahi ginte)
    let anyShort = false;

    for (const subject of blueprint.subjects) {
      const topicsReport = [];
      for (const topic of subject.topics) {
        let available;
        if (topic.isUnseenPassage) {
          // Unseen Passage ke liye — kitne passages hain aur unme kitne
          // total questions hain (sabse bade passage ka size batate hain,
          // kyunki EK poora passage hi ek baar mein use hota hai)
          const passages = await UnseenPassage.find({
            examName,
            subjectName: subject.subjectName,
            topicName: topic.topicName,
          }).select("questions");
          const maxPassageSize = passages.reduce((max, p) => Math.max(max, p.questions.length), 0);
          available = maxPassageSize; // best passage kitne questions de sakta hai
          topicsReport.push({
            topicName: topic.topicName,
            needed: topic.questionCount,
            available,
            isUnseenPassage: true,
            passageCount: passages.length,
            short: available < topic.questionCount,
          });
        } else {
          available = await Question.countDocuments({
            examName: { $in: [examName] },
            subjectName: subject.subjectName,
            topicName: topic.topicName,
          });
          topicsReport.push({
            topicName: topic.topicName,
            needed: topic.questionCount,
            available,
            isUnseenPassage: false,
            short: available < topic.questionCount,
          });
        }

        totalNeeded += topic.questionCount;
        totalAvailable += Math.min(available, topic.questionCount);
        if (available < topic.questionCount) anyShort = true;
      }

      subjectsReport.push({
        subjectName: subject.subjectName,
        needed: subject.questionCount,
        topics: topicsReport,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        blueprintName: blueprint.blueprintName,
        totalQuestionsDeclared: blueprint.totalQuestions,
        totalNeeded,
        totalAvailable, // agar mock abhi generate karein to max kitne milenge
        anyShort,
        subjects: subjectsReport,
      },
    });
  } catch (error) {
    console.error("getBlueprintCoverage error:", error);
    return res.status(500).json({ success: false, message: "Coverage check karte waqt error aaya." });
  }
};
