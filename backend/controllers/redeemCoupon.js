// controllers/redeemCoupon.js
// Student coupon code dalke apne batch (teacher-group) mein enroll hota hai.
// Route: POST /redeem-coupon (userInfo middleware ke peeche)
import Coupon from "../models/Coupon.js";

export const redeemCoupon = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: "Coupon code zaroori hai!",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 1: Coupon dhundo
    // ─────────────────────────────────────────────
    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Ye coupon code nahi mila. Sahi code check karein.",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 2: Exam match check — coupon jis exam ke liye bana hai,
    // student ka current exam wahi hona chahiye
    // ─────────────────────────────────────────────
    if (coupon.exam !== req.user.exam) {
      return res.status(400).json({
        success: false,
        message: `Ye coupon '${coupon.exam}' exam ke liye hai, lekin aapka current exam '${req.user.exam}' hai.`,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 3: Already isi coupon mein enrolled hai to dobara redeem block karo
    // ─────────────────────────────────────────────
    if (req.user.activeCoupon && req.user.activeCoupon.toString() === coupon._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Aap pehle se is batch mein enrolled hain!",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 4: Agar pehle se koi active coupon tha, uska history-entry
    // close karo (leftAt set karo) — purana data delete nahi hota,
    // sirf current context badalta hai (exam-change wala hi pattern).
    // ─────────────────────────────────────────────
    if (req.user.activeCoupon) {
      const currentEntry = req.user.couponHistory.find(
        (h) => h.coupon.toString() === req.user.activeCoupon.toString() && h.leftAt === null
      );
      if (currentEntry) {
        currentEntry.leftAt = new Date();
      }
    }

    // ─────────────────────────────────────────────
    // STEP 5: Naya coupon active karo + history mein naya entry push karo
    // ─────────────────────────────────────────────
    req.user.activeCoupon = coupon._id;
    req.user.couponHistory.push({
      coupon: coupon._id,
      examNameAtJoin: req.user.exam,
      joinedAt: new Date(),
      leftAt: null,
    });

    await req.user.save();

    // ─────────────────────────────────────────────
    // STEP 6: Response
    // ─────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      message: `'${coupon.name}' batch mein successfully enroll ho gaye!`,
      data: {
        activeCoupon: {
          _id: coupon._id,
          name: coupon.name,
          code: coupon.code,
          exam: coupon.exam,
        },
      },
    });
  } catch (error) {
    console.error("redeemCoupon error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya coupon redeem karte waqt.",
      error: error.message,
    });
  }
};