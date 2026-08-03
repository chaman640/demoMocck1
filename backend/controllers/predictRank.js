// controllers/predictRank.js
import RankPredictorData from "../models/RankPredictorData.js";

// ─────────────────────────────────────────────
// HELPER: Linear interpolation
// ─────────────────────────────────────────────
const interpolate = (score, lowerPoint, upperPoint) => {
  const { score: s1, rank: r1 } = upperPoint; // upper score, better rank
  const { score: s2, rank: r2 } = lowerPoint; // lower score, worse rank

  if (s1 === s2) return r1; // divide by zero se bacho

  const ratio = (score - s2) / (s1 - s2);
  const estimatedRank = r2 - ratio * (r2 - r1);

  return Math.round(estimatedRank);
};

export const predictRank = async (req, res) => {
  try {
    const { examName } = req.params;
    const { score } = req.query;

    if (score === undefined || score === "" || isNaN(Number(score))) {
      return res.status(400).json({
        success: false,
        message: "Valid score query parameter zaroori hai! (e.g. ?score=145)",
      });
    }

    const userScore = Number(score);

    const rankData = await RankPredictorData.findOne({ examName, isActive: true });

    if (!rankData || !Array.isArray(rankData.dataPoints) || rankData.dataPoints.length < 2) {
      return res.status(404).json({
        success: false,
        message: "Is exam ke liye rank predictor data abhi available nahi hai.",
      });
    }

    // 🐛 FIX: pehle maan liya jata tha ki dataPoints hamesha descending sorted
    // hain (kyunki addRankPredictorData sort karke save karta hai). Lekin agar
    // koi purana document ya manually daala hua doc unsorted ho, to poora
    // interpolation ulta chal jata tha aur bilkul galat rank aata tha.
    // Ab yahin defensively sort kar rahe hain.
    const points = [...rankData.dataPoints].sort((a, b) => b.score - a.score);

    let estimatedRank;
    let confidence = "medium";

    // STEP 2: Edge cases
    if (userScore >= points[0].score) {
      estimatedRank = Math.max(1, points[0].rank - Math.round((userScore - points[0].score) * 10));
      confidence = "low";
    } else if (userScore <= points[points.length - 1].score) {
      const lastPoint = points[points.length - 1];
      estimatedRank = lastPoint.rank + Math.round((lastPoint.score - userScore) * 50);
      confidence = "low";
    } else {
      // STEP 3: Normal case — do points ke beech interpolate
      for (let i = 0; i < points.length - 1; i++) {
        const upper = points[i];
        const lower = points[i + 1];

        if (userScore <= upper.score && userScore >= lower.score) {
          estimatedRank = interpolate(userScore, lower, upper);
          confidence = "high";
          break;
        }
      }
    }

    // 🐛 FIX: agar kisi wajah se loop match na kare (duplicate scores waghairah),
    // estimatedRank `undefined` reh jata tha → aage NaN → frontend pe
    // "#NaN – #NaN" dikhta tha. Ab safe fallback.
    if (estimatedRank === undefined || Number.isNaN(estimatedRank)) {
      estimatedRank = points[points.length - 1].rank;
      confidence = "low";
    }
    estimatedRank = Math.max(1, Math.round(estimatedRank));

    // STEP 4: Rank ko RANGE mein convert karo (±10%, min ±50)
    const rangeMargin = Math.max(50, Math.round(estimatedRank * 0.1));
    const rankRangeLow = Math.max(1, estimatedRank - rangeMargin);
    const rankRangeHigh = estimatedRank + rangeMargin;

    // STEP 5: Selection chance
    let selectionChance = null;
    if (rankData.totalVacancies) {
      if (rankRangeHigh <= rankData.totalVacancies) selectionChance = "strong";
      else if (rankRangeLow <= rankData.totalVacancies) selectionChance = "borderline";
      else selectionChance = "unlikely";
    }

    return res.status(200).json({
      success: true,
      data: {
        examName: rankData.examName,
        year: rankData.year,
        userScore,
        estimatedRank,
        rankRangeLow,
        rankRangeHigh,
        confidence,
        totalCandidates: rankData.totalCandidates || null,
        totalVacancies: rankData.totalVacancies || null,
        selectionChance,
      },
    });
  } catch (error) {
    console.error("predictRank error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya rank predict karte waqt.",
      error: error.message,
    });
  }
};
