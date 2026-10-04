// controllers/getClassQuestionAnalysis.js
import {
  resolveFilteredStudentIds,
  getAllowedSubjectsForTeacher,
  getQuestionWiseBreakdown,
} from "../utils/classAnalytics.js";
import { sameSubject, normalizeSubject } from "../utils/subjectName.js";

export const getClassQuestionAnalysis = async (req, res) => {
  try {
    const { subjectName, topicName } = req.params;
    const { filter = "all", minPercentile, maxPercentile } = req.query;

    if (!subjectName || !topicName) {
      return res.status(400).json({ success: false, message: "subjectName and topicName are required." });
    }

    // Sub-teacher apne authorized subject ke alawa kisi aur subject ka
    // drill-down nahi dekh sakta — privacy/scope enforcement
    const allowedSubjects = await getAllowedSubjectsForTeacher(req.teacher);

    // 🐛 FIX: pehle `!allowedSubjects.includes(subjectName)` se exact match hota tha.
    // "Maths" ka access hone par bhi "maths" wale drill-down par 403 aa jata tha.
    if (Array.isArray(allowedSubjects) && !allowedSubjects.some((a) => sameSubject(a, subjectName))) {
      return res.status(403).json({
        success: false,
        message: `You are not authorized for subject '${normalizeSubject(subjectName)}'.`,
      });
    }

    const { studentIds, totalBatchStudents, selectedCount, examName, couponName } =
      await resolveFilteredStudentIds(req.teacher, { filter, minPercentile, maxPercentile });

    if (studentIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "There are no students in this batch yet.",
        data: { questions: [], totalBatchStudents, selectedCount: 0 },
      });
    }

    const questions = await getQuestionWiseBreakdown(studentIds, examName, subjectName, topicName);

    return res.status(200).json({
      success: true,
      data: {
        examName,
        couponName,
        subjectName,
        topicName,
        filter,
        totalBatchStudents,
        selectedCount,
        questions,
      },
    });
  } catch (error) {
    console.error("getClassQuestionAnalysis error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Error while fetching class question analysis.",
      error: error.statusCode ? undefined : error.message,
    });
  }
};
