import Book from "../models/Book.js";
import BookRedemption from "../models/BookRedemption.js";
import User from "../models/User.js";
import { COIN_CONFIG } from "../utils/coinRewards.js";

export const getBooksForStudent = async (req, res) => {
  try {
    const [books, myRedemptions, me] = await Promise.all([
      Book.find({ status: "active" }).sort({ createdAt: -1 }),
      BookRedemption.find({ user: req.user._id }).select("book"),
      User.findById(req.user._id).select("freePhysicalClaims"),
    ]);

    const redeemedBookIds = new Set(myRedemptions.map((r) => String(r.book)));
    const freeLimitReached = (me?.freePhysicalClaims || 0) >= COIN_CONFIG.FREE_PHYSICAL_BOOK_LIMIT;

    const data = books.map((b) => {
      const alreadyRedeemed = redeemedBookIds.has(String(b._id));
      return {
        _id: b._id,
        title: b.title,
        description: b.description,
        coverImageUrl: b.coverImageUrl,
        type: b.type,
        isFree: b.isFree,
        coinCost: b.isFree ? 0 : b.coinCost,
        inStock: b.type === "physical" ? b.stockQuantity === null || b.stockQuantity > 0 : true,
        alreadyRedeemed,
        freeLimitReached: !alreadyRedeemed && b.type === "physical" && b.isFree && freeLimitReached,
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("getBooksForStudent error:", error);
    return res.status(500).json({ success: false, message: "Could not load the books list." });
  }
};
