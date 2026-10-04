// controllers/hideQuestion.js
import HiddenQuestion from "../models/HiddenQuestion.js";

export const hideQuestion = async (req, res) => {
  try {
    const userId = req.user._id;
    const { questionId } = req.body;

    if (!questionId) {
      return res.status(400).json({ success: false, message: "questionId is required!" });
    }

    // upsert — agar pehle se hidden hai to bhi error na aaye
    await HiddenQuestion.findOneAndUpdate(
      { userId, questionId },
      { $setOnInsert: { userId, questionId } },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: "This question has been removed from the analysis.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error while hiding the question.",
      error: error.message,
    });
  }
};