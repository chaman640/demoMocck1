// controllers/getTeacherCustomTests.js
// Teacher ke active-coupon ke sabhi custom tests ki list
import CustomTest from "../models/CustomTest.js";

export const getTeacherCustomTests = async (req, res) => {
  try {
    const teacher = req.teacher;
    if (!teacher.activeCoupon) {
      return res.status(400).json({
        success: false,
        message: "Pehle apna active batch select karein!",
      });
    }

    const tests = await CustomTest.find({ couponId: teacher.activeCoupon })
      .select("testName totalQuestions durationMinutes marksPerQuestion negativeMarking subjects createdBy createdAt")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    const data = tests.map((t) => ({
      testId: t._id,
      testName: t.testName,
      totalQuestions: t.totalQuestions,
      durationMinutes: t.durationMinutes,
      subjectNames: t.subjects.map((s) => s.subjectName),
      createdByName: t.createdBy?.name || "Unknown",
      createdAt: t.createdAt,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("getTeacherCustomTests error:", error);
    return res.status(500).json({
      success: false,
      message: "Custom tests list fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};