// controllers/getRankPredictorData.js
import RankPredictorData from "../models/RankPredictorData.js";

// ─────────────────────────────────────────────
// HELPER: Rank → Score interpolation
// ─────────────────────────────────────────────
const interpolateScore = (targetRank, betterPoint, worsePoint) => {
  const { score: s1, rank: r1 } = betterPoint; // better rank (lower number, higher score)
  const { score: s2, rank: r2 } = worsePoint; // worse rank (higher number, lower score)

  if (r1 === r2) return s1; // divide by zero se bacho

  const ratio = (targetRank - r1) / (r2 - r1);
  const estimatedScore = s1 - ratio * (s1 - s2);

  return Math.round(estimatedScore * 100) / 100;
};

// ─────────────────────────────────────────────
// HELPER: totalVacancies (target rank) se expected cutoff
// ─────────────────────────────────────────────
const calculateExpectedCutoff = (rawPoints, totalVacancies) => {
  if (!totalVacancies || !Array.isArray(rawPoints) || rawPoints.length < 2) return null;

  // 🐛 FIX: defensive sort — pehle assume kiya jata tha ki data already
  // descending sorted hai. Unsorted data pe cutoff bilkul ulta aata tha.
  const points = [...rawPoints].sort((a, b) => b.score - a.score);

  const targetRank = totalVacancies;

  let estimatedScore;
  let confidence = "medium";

  if (targetRank <= points[0].rank) {
    estimatedScore = points[0].score + (points[0].rank - targetRank) * 0.1;
    confidence = "low";
  } else if (targetRank >= points[points.length - 1].rank) {
    const lastPoint = points[points.length - 1];
    estimatedScore = lastPoint.score - (targetRank - lastPoint.rank) * 0.02;
    confidence = "low";
  } else {
    for (let i = 0; i < points.length - 1; i++) {
      const better = points[i];
      const worse = points[i + 1];

      if (targetRank >= better.rank && targetRank <= worse.rank) {
        estimatedScore = interpolateScore(targetRank, better, worse);
        confidence = "high";
        break;
      }
    }
  }

  // 🐛 FIX: agar koi bhi branch match na kare to estimatedScore `undefined`
  // reh jata tha → Math.max(0, undefined) = NaN → frontend pe "NaN" dikhta tha.
  if (estimatedScore === undefined || Number.isNaN(estimatedScore)) {
    estimatedScore = points[points.length - 1].score;
    confidence = "low";
  }

  estimatedScore = Math.max(0, Math.round(estimatedScore * 100) / 100);

  return { expectedScore: estimatedScore, targetRank, confidence };
};

export const getRankPredictorData = async (req, res) => {
  try {
    const { examName } = req.params;

    const rankData = await RankPredictorData.findOne({ examName, isActive: true });

    // Note: jaanbujh kar 200 + available:false bhej rahe hain, taaki frontend
    // ko sirf "data hai ya nahi" check karne ke liye try/catch na lagana pade.
    if (!rankData) {
      return res.status(200).json({ success: true, available: false, data: null });
    }

    const expectedCutoff = calculateExpectedCutoff(rankData.dataPoints, rankData.totalVacancies);

    return res.status(200).json({
      success: true,
      available: true,
      data: {
        examName: rankData.examName,
        year: rankData.year,
        dataPoints: rankData.dataPoints,
        totalCandidates: rankData.totalCandidates,
        totalVacancies: rankData.totalVacancies,
        expectedCutoff,
        updatedAt: rankData.updatedAt,
      },
    });
  } catch (error) {
    console.error("getRankPredictorData error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya rank predictor data fetch karte waqt.",
      error: error.message,
    });
  }
};
