// controllers/predictRank.js
import RankPredictorData from "../models/RankPredictorData.js";

// ─────────────────────────────────────────────
// HELPER: Linear interpolation
// Do known points (score1,rank1) aur (score2,rank2) ke beech
// diye gaye score ke liye rank estimate karta hai
// ─────────────────────────────────────────────
const interpolate = (score, lowerPoint, upperPoint) => {
  // lowerPoint = lower score (higher rank number)
  // upperPoint = higher score (lower rank number)
  const { score: s1, rank: r1 } = upperPoint; // upper score, better rank
  const { score: s2, rank: r2 } = lowerPoint; // lower score, worse rank

  if (s1 === s2) return r1; // avoid divide by zero

  // Linear interpolation formula
  const ratio = (score - s2) / (s1 - s2);
  const estimatedRank = r2 - ratio * (r2 - r1);

  return Math.round(estimatedRank);
};

export const predictRank = async (req, res) => {
  try {
    const { examName } = req.params;
    const { score } = req.query;

    if (score === undefined || isNaN(Number(score))) {
      return res.status(400).json({
        success: false,
        message: "Valid score query parameter zaroori hai! (e.g. ?score=145)",
      });
    }

    const userScore = Number(score);

    // ─────────────────────────────────────────────
    // STEP 1: Is exam ka active data dhundo
    // ─────────────────────────────────────────────
    const rankData = await RankPredictorData.findOne({
      examName,
      isActive: true,
    });

    if (!rankData || rankData.dataPoints.length < 2) {
      return res.status(404).json({
        success: false,
        message: "Is exam ke liye rank predictor data abhi available nahi hai.",
      });
    }

    // dataPoints already descending order mein save hain (highest score first)
    const points = rankData.dataPoints;

    let estimatedRank;
    let confidence = "medium"; // "high" | "medium" | "low" — kitna reliable estimate hai

    // ─────────────────────────────────────────────
    // STEP 2: Edge cases handle karo
    // ─────────────────────────────────────────────
    if (userScore >= points[0].score) {
      // User ka score sabse highest reference point se bhi zyada/equal hai
      // Extrapolation risky hai — top rank ke aas-paas bata do, low confidence
      estimatedRank = Math.max(1, points[0].rank - Math.round((userScore - points[0].score) * 10));
      confidence = "low";
    } else if (userScore <= points[points.length - 1].score) {
      // User ka score sabse lowest reference point se bhi kam hai
      const lastPoint = points[points.length - 1];
      estimatedRank = lastPoint.rank + Math.round((lastPoint.score - userScore) * 50);
      confidence = "low";
    } else {
      // ─────────────────────────────────────────────
      // STEP 3: Normal case — do points ke beech interpolate karo
      // ─────────────────────────────────────────────
      for (let i = 0; i < points.length - 1; i++) {
        const upper = points[i];     // higher score
        const lower = points[i + 1]; // lower score

        if (userScore <= upper.score && userScore >= lower.score) {
          estimatedRank = interpolate(userScore, lower, upper);
          confidence = "high"; // do actual reference points ke beech hai — reliable
          break;
        }
      }
    }

    // ─────────────────────────────────────────────
    // STEP 4: Rank ko ek RANGE mein convert karo
    // Exact number dena galat expectation create karta hai —
    // isliye ±10% ka range dikhayenge
    // ─────────────────────────────────────────────
    const rangeMargin = Math.max(50, Math.round(estimatedRank * 0.1));
    const rankRangeLow = Math.max(1, estimatedRank - rangeMargin);
    const rankRangeHigh = estimatedRank + rangeMargin;

    // ─────────────────────────────────────────────
    // STEP 5: Selection chance (agar vacancies data hai)
    // ─────────────────────────────────────────────
    let selectionChance = null;
    if (rankData.totalVacancies) {
      if (rankRangeHigh <= rankData.totalVacancies) {
        selectionChance = "strong"; // rank range poori tarah vacancy ke andar hai
      } else if (rankRangeLow <= rankData.totalVacancies) {
        selectionChance = "borderline"; // range vacancy line ke aas-paas hai
      } else {
        selectionChance = "unlikely";
      }
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