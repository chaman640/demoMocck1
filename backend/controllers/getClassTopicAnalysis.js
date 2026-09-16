// controllers/getClassTopicAnalysis.js
import {
  resolveFilteredStudentIds,
  getAllowedSubjectsForTeacher,
  getTopicWiseBreakdown,
  getTestTypeComparison, // 🆕
} from "../utils/classAnalytics.js";

export const getClassTopicAnalysis = async (req, res) => {
  try {
    const { filter = "all", minPercentile, maxPercentile } = req.query;

    const { studentIds, totalBatchStudents, totalWithData, selectedCount, examName, couponName } =
      await resolveFilteredStudentIds(req.teacher, { filter, minPercentile, maxPercentile });

    if (studentIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Is batch mein abhi koi student nahi hai.",
        data: { topics: [], testTypeComparison: [], totalBatchStudents, selectedCount: 0 },
      });
    }

    const allowedSubjects = await getAllowedSubjectsForTeacher(req.teacher);

    // 🆕 topics ab Mock + PYQ + Custom Test teenon se merge hokar aate hain
    const [topics, testTypeComparison] = await Promise.all([
      getTopicWiseBreakdown(studentIds, examName, allowedSubjects),
      getTestTypeComparison(studentIds, examName),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        examName,
        couponName,
        filter,
        totalBatchStudents,
        totalWithData,
        selectedCount,
        topics,
        testTypeComparison, // 🆕
      },
    });
  } catch (error) {
    console.error("getClassTopicAnalysis error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Class topic analysis fetch karte waqt error aaya.",
      error: error.statusCode ? undefined : error.message,
    });
  }
};
