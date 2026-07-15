// controllers/getRankPredictorData.js
import RankPredictorData from "../models/RankPredictorData.js";

// ─────────────────────────────────────────────
// HELPER: Rank → Score interpolation (predictRank.js ke ulta)
// Do known points (score1,rank1) aur (score2,rank2) ke beech
// diye gaye rank ke liye score estimate karta hai
// ─────────────────────────────────────────────
const interpolateScore = (targetRank, betterPoint, worsePoint) => {
  // betterPoint = better rank (lower number, higher score)
  // worsePoint = worse rank (higher number, lower score)
  const { score: s1, rank: r1 } = betterPoint;
  const { score: s2, rank: r2 } = worsePoint;

  if (r1 === r2) return s1; // avoid divide by zero

  const ratio = (targetRank - r1) / (r2 - r1);
  const estimatedScore = s1 - ratio * (s1 - s2);

  return Math.round(estimatedScore * 100) / 100; // 2 decimal tak
};

// ─────────────────────────────────────────────
// HELPER: totalVacancies (target rank) ke hisaab se
// expected cutoff score calculate karta hai
// ─────────────────────────────────────────────
const calculateExpectedCutoff = (points, totalVacancies) => {
  if (!totalVacancies || points.length < 2) return null;

  const targetRank = totalVacancies;

  let estimatedScore;
  let confidence = "medium";

  // points already score ke hisaab se descending sorted hain
  // (matlab rank ke hisaab se ascending — best rank pehle)

  if (targetRank <= points[0].rank) {
    // Target rank sabse best reference point se bhi behtar/equal hai
    // Extrapolation — top score ke aas-paas, low confidence
    estimatedScore = points[0].score + (points[0].rank - targetRank) * 0.1;
    confidence = "low";
  } else if (targetRank >= points[points.length - 1].rank) {
    // Target rank sabse worst reference point se bhi zyada hai
    const lastPoint = points[points.length - 1];
    estimatedScore = lastPoint.score - (targetRank - lastPoint.rank) * 0.02;
    confidence = "low";
  } else {
    // Normal case — do points ke beech interpolate karo
    for (let i = 0; i < points.length - 1; i++) {
      const better = points[i];     // better rank (lower number)
      const worse = points[i + 1];  // worse rank (higher number)

      if (targetRank >= better.rank && targetRank <= worse.rank) {
        estimatedScore = interpolateScore(targetRank, better, worse);
        confidence = "high"; // do actual reference points ke beech hai
        break;
      }
    }
  }

  // Score negative na ho jaaye
  estimatedScore = Math.max(0, estimatedScore);

  return {
    expectedScore: estimatedScore,
    targetRank,
    confidence,
  };
};

export const getRankPredictorData = async (req, res) => {
  try {
    const { examName } = req.params;

    const rankData = await RankPredictorData.findOne({
      examName,
      isActive: true,
    });

    // ─────────────────────────────────────────────
    // Note: Yahan 404 nahi bheja — jaanbujh kar 200 status
    // ke sath "available: false" bheja hai. Isse frontend
    // ko har baar try/catch se error handle nahi karna padega
    // sirf "data hai ya nahi" check karne ke liye — simple
    // if-else se kaam chal jayega.
    // ─────────────────────────────────────────────
    if (!rankData) {
      return res.status(200).json({
        success: true,
        available: false,
        data: null,
      });
    }

    // 👇 NAYA: Expected cutoff calculate karo (totalVacancies ke basis pe)
    const expectedCutoff = calculateExpectedCutoff(
      rankData.dataPoints,
      rankData.totalVacancies
    );

    return res.status(200).json({
      success: true,
      available: true,
      data: {
        examName: rankData.examName,
        year: rankData.year,
        dataPoints: rankData.dataPoints,
        totalCandidates: rankData.totalCandidates,
        totalVacancies: rankData.totalVacancies,
        expectedCutoff, // 👈 NAYA — { expectedScore, targetRank, confidence } ya null
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