// controllers/getTeacherPYQPapers.js
// Teacher ke active-coupon ke sabhi PYQ paper-shells ki list — har paper
// ke saath per-subject progress (kitna quota bhara, kitna baaki). Sub-teacher
// ke liye ye bhi batata hai ki kaunse subjects wo fill kar sakta hai.
import PreviousYearTest from "../models/PreviousYearTest.js";
import CouponAccess from "../models/CouponAccess.js";

export const getTeacherPYQPapers = async (req, res) => {
  try {
    const teacher = req.teacher;
    if (!teacher.activeCoupon) {
      return res.status(400).json({
        success: false,
        message: "Pehle apna active batch select karein!",
      });
    }

    const papers = await PreviousYearTest.find({ couponId: teacher.activeCoupon })
      .select("testName year durationMinutes marksPerQuestion negativeMarking status blueprint subjects createdAt")
      .sort({ createdAt: -1 });

    // Sub-teacher ke authorized subjects — Main Teacher ke liye null (sab allowed)
    let authorizedSubjects = null;
    if (teacher.role === "sub") {
      const records = await CouponAccess.find({
        coupon: teacher.activeCoupon,
        subTeacher: teacher._id,
      }).select("subject");
      authorizedSubjects = records.map((r) => r.subject);
    }

    const data = papers.map((p) => {
      const subjectProgress = p.blueprint.map((b) => {
        const subjBlock = p.subjects.find((s) => s.subjectName === b.subjectName);
        return {
          subjectName: b.subjectName,
          required: b.questionCount,
          current: subjBlock ? subjBlock.questions.length : 0,
          filled: subjBlock ? subjBlock.filled : false,
          canFill: authorizedSubjects === null ? true : authorizedSubjects.includes(b.subjectName),
        };
      });

      return {
        paperId: p._id,
        testName: p.testName,
        year: p.year,
        durationMinutes: p.durationMinutes,
        status: p.status,
        subjectProgress,
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("getTeacherPYQPapers error:", error);
    return res.status(500).json({
      success: false,
      message: "Papers list fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};