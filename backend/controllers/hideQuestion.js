// controllers/hideQuestion.js
import HiddenQuestion from "../models/HiddenQuestion.js";

export const hideQuestion = async (req, res) => {
  try {
    const userId = req.user._id;
    const { questionId } = req.body;

    if (!questionId) {
      return res.status(400).json({ success: false, message: "questionId zaroori hai!" });
    }

    // upsert — agar pehle se hidden hai to bhi error na aaye
    await HiddenQuestion.findOneAndUpdate(
      { userId, questionId },
      { $setOnInsert: { userId, questionId } },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Ye sawaal analysis se hata diya gaya.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Sawaal hide karte waqt error aaya.",
      error: error.message,
    });
  }
};