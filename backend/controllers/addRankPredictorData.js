// controllers/addRankPredictorData.js
import RankPredictorData from "../models/RankPredictorData.js";

export const addRankPredictorData = async (req, res) => {
  try {
    const { examName, year, dataPoints, totalCandidates, totalVacancies } = req.body;

    if (!examName || !year || !Array.isArray(dataPoints) || dataPoints.length < 2) {
      return res.status(400).json({
        success: false,
        message: "examName, year, aur kam se kam 2 dataPoints zaroori hain!",
      });
    }

    // Validate: har point mein score aur rank dono ho
    for (const point of dataPoints) {
      if (typeof point.score !== "number" || typeof point.rank !== "number") {
        return res.status(400).json({
          success: false,
          message: "Har dataPoint mein numeric score aur rank hona zaroori hai!",
        });
      }
    }

    // Score ke hisaab se descending sort kar do (high score = low rank)
    // taaki interpolation logic simple rahe
    const sortedPoints = [...dataPoints].sort((a, b) => b.score - a.score);

    // Naya data active banayenge — isliye purana active data (agar hai) inactive kar do
    await RankPredictorData.updateMany(
      { examName, isActive: true },
      { $set: { isActive: false } }
    );

    const newData = new RankPredictorData({
      examName,
      year,
      dataPoints: sortedPoints,
      totalCandidates,
      totalVacancies,
      isActive: true,
    });

    await newData.save();

    return res.status(201).json({
      success: true,
      message: "Rank predictor data successfully save ho gaya!",
      data: newData,
    });
  } catch (error) {
    console.error("addRankPredictorData error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya data save karte waqt.",
      error: error.message,
    });
  }
};