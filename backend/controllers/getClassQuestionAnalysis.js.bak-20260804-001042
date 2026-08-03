// controllers/getClassQuestionAnalysis.js
import {
  resolveFilteredStudentIds,
  getAllowedSubjectsForTeacher,
  getQuestionWiseBreakdown,
} from "../utils/classAnalytics.js";

export const getClassQuestionAnalysis = async (req, res) => {
  try {
    const { subjectName, topicName } = req.params;
    const { filter = "all", minPercentile, maxPercentile } = req.query;

    if (!subjectName || !topicName) {
      return res.status(400).json({
        success: false,
        message: "subjectName aur topicName zaroori hain.",
      });
    }

    // Sub-teacher apne authorized subject ke alawa kisi aur subject ka
    // drill-down nahi dekh sakta — privacy/scope enforcement
    const allowedSubjects = await getAllowedSubjectsForTeacher(req.teacher);
    if (Array.isArray(allowedSubjects) && !allowedSubjects.includes(subjectName)) {
      return res.status(403).json({
        success: false,
        message: `Aap '${subjectName}' subject ke liye authorized nahi hain.`,
      });
    }

    const { studentIds, totalBatchStudents, selectedCount, examName, couponName } =
      await resolveFilteredStudentIds(req.teacher, { filter, minPercentile, maxPercentile });

    if (studentIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Is batch mein abhi koi student nahi hai.",
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
      message: error.statusCode ? error.message : "Class question analysis fetch karte waqt error aaya.",
      error: error.statusCode ? undefined : error.message,
    });
  }
};