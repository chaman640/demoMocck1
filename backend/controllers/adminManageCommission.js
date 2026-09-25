import Promoter from "../models/Promoter.js";
import Teacher from "../models/Teacher.js";

export const adminSettlePromoterCommission = async (req, res) => {
  try {
    const { promoterId } = req.params;
    const { amount, note } = req.body;

    const numericAmount = Number(amount);
    if (amount === undefined || amount === null || amount === "" || Number.isNaN(numericAmount) || numericAmount < 0) {
      return res.status(400).json({ success: false, message: "Sahi amount daalein!" });
    }

    const promoter = await Promoter.findById(promoterId);
    if (!promoter) {
      return res.status(404).json({ success: false, message: "Promoter nahi mila!" });
    }

    promoter.paymentHistory.push({
      amount: numericAmount,
      questionsSettled: promoter.pendingQuestionsCount,
      settledAt: new Date(),
      note: note ? String(note).trim() : "",
    });
    promoter.pendingQuestionsCount = 0;
    await promoter.save();

    return res.status(200).json({
      success: true,
      message: "Hisab settle ho gaya!",
      data: {
        _id: promoter._id,
        pendingQuestionsCount: promoter.pendingQuestionsCount,
        totalQuestionsAllTime: promoter.totalQuestionsAllTime,
        paymentHistory: promoter.paymentHistory,
      },
    });
  } catch (error) {
    console.error("adminSettlePromoterCommission error:", error);
    return res.status(500).json({ success: false, message: "Hisab settle karte waqt error aaya." });
  }
};

export const adminSettleTeacherCommission = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { amount, note } = req.body;

    const numericAmount = Number(amount);
    if (amount === undefined || amount === null || amount === "" || Number.isNaN(numericAmount) || numericAmount < 0) {
      return res.status(400).json({ success: false, message: "Sahi amount daalein!" });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher nahi mila!" });
    }
    if (teacher.role !== "main") {
      return res.status(400).json({
        success: false,
        message: "Sirf Main Teacher ka hisab settle kiya ja sakta hai.",
      });
    }

    teacher.paymentHistory.push({
      amount: numericAmount,
      questionsSettled: teacher.pendingQuestionsCount,
      settledAt: new Date(),
      note: note ? String(note).trim() : "",
    });
    teacher.pendingQuestionsCount = 0;
    await teacher.save();

    return res.status(200).json({
      success: true,
      message: "Hisab settle ho gaya!",
      data: {
        _id: teacher._id,
        pendingQuestionsCount: teacher.pendingQuestionsCount,
        totalQuestionsAllTime: teacher.totalQuestionsAllTime,
        paymentHistory: teacher.paymentHistory,
      },
    });
  } catch (error) {
    console.error("adminSettleTeacherCommission error:", error);
    return res.status(500).json({ success: false, message: "Hisab settle karte waqt error aaya." });
  }
};
