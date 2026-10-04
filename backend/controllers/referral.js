// controllers/referral.js
// GET /referral/me → student ka apna referral code (pehli baar maangne par
// ban jaata hai), share link, aur kitne dost aaye / kitne coins mile.
import User from "../models/User.js";
import CoinTransaction from "../models/CoinTransaction.js";
import { COIN_CONFIG } from "../utils/coinRewards.js";
import { generateUniqueCode } from "../utils/codeRegistry.js";

const DEFAULT_FRONTEND = "https://mocktest1.onrender.com";

export const referralLinkFor = (code) =>
  `${(process.env.FRONTEND_URL || DEFAULT_FRONTEND).replace(/\/+$/, "")}/#/Singup?ref=${code}&kind=student`;

const ensureReferralCode = async (user) => {
  if (user.referralCode) return user.referralCode;
  // Naam ke pehle akshar + random (jaise RAHU7K2M) — yaad rakhna aasaan
  const prefix = String(user.name || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
  for (let i = 0; i < 3; i++) {
    const code = await generateUniqueCode(prefix, 8);
    if (!code) continue;
    try {
      const updated = await User.findOneAndUpdate(
        { _id: user._id, referralCode: null },
        { $set: { referralCode: code } },
        { new: true, projection: { referralCode: 1 } }
      );
      if (updated) return updated.referralCode;
      // Doosri request ne pehle hi bana diya
      const fresh = await User.findById(user._id).select("referralCode");
      if (fresh?.referralCode) return fresh.referralCode;
    } catch (error) {
      if (error.code !== 11000) throw error; // code collision → dobara try
    }
  }
  return null;
};

export const getMyReferral = async (req, res) => {
  try {
    const code = await ensureReferralCode(req.user);
    if (!code) return res.status(500).json({ success: false, message: "Could not create the referral code. Try again." });

    const [joinedCount, rewardedCount, earned] = await Promise.all([
      User.countDocuments({ referredBy: req.user._id }),
      User.countDocuments({ referredBy: req.user._id, referralRewarded: true }),
      CoinTransaction.aggregate([
        { $match: { user: req.user._id, type: "referral_bonus" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        code,
        link: referralLinkFor(code),
        bonusCoins: COIN_CONFIG.REFERRAL_BONUS_COINS,
        joinedCount,
        rewardedCount,
        pendingCount: joinedCount - rewardedCount,
        coinsEarned: earned[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("getMyReferral error:", error);
    return res.status(500).json({ success: false, message: "Could not load referral details." });
  }
};
