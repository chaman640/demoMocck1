import Book from "../models/Book.js";
import BookRedemption from "../models/BookRedemption.js";
import User from "../models/User.js";
import CoinTransaction from "../models/CoinTransaction.js";
import { COIN_CONFIG } from "../utils/coinRewards.js";

export const redeemBook = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { shippingAddress } = req.body;

    const book = await Book.findOne({ _id: bookId, status: "active" });
    if (!book) {
      return res.status(404).json({ success: false, message: "Ye book available nahi hai." });
    }

    const alreadyRedeemed = await BookRedemption.findOne({ user: req.user._id, book: book._id });
    if (alreadyRedeemed) {
      return res.status(400).json({ success: false, message: "Aap ye book pehle hi le chuke hain." });
    }

    const cost = book.isFree ? 0 : book.coinCost;

    if (book.type === "physical") {
      if (!shippingAddress || !shippingAddress.name || !shippingAddress.phone || !shippingAddress.addressLine || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pincode) {
        return res.status(400).json({
          success: false,
          message: "Physical book ke liye poora address (naam, phone, address, city, state, pincode) bharna zaroori hai.",
        });
      }
      if (!/^\d{6}$/.test(String(shippingAddress.pincode).trim())) {
        return res.status(400).json({ success: false, message: "Pincode 6 anko ka hona chahiye." });
      }
      if (!/^\d{10}$/.test(String(shippingAddress.phone).trim())) {
        return res.status(400).json({ success: false, message: "Phone number 10 anko ka hona chahiye." });
      }

      if (book.isFree) {
        const freePhysicalCount = await BookRedemption.countDocuments({
          user: req.user._id,
          coinsSpent: 0,
          "bookSnapshot.type": "physical",
        });
        if (freePhysicalCount >= COIN_CONFIG.FREE_PHYSICAL_BOOK_LIMIT) {
          return res.status(400).json({
            success: false,
            message: `Free physical book sirf ${COIN_CONFIG.FREE_PHYSICAL_BOOK_LIMIT} baar li ja sakti hai.`,
          });
        }
      }
    }

    if (book.type === "physical" && book.stockQuantity !== null) {
      const stockResult = await Book.findOneAndUpdate(
        { _id: book._id, stockQuantity: { $gt: 0 } },
        { $inc: { stockQuantity: -1 } },
        { new: true }
      );
      if (!stockResult) {
        return res.status(400).json({ success: false, message: "Ye book stock mein nahi hai." });
      }
    }

    if (cost > 0) {
      const user = await User.findById(req.user._id).select("coins");
      if (!user || (user.coins || 0) < cost) {
        if (book.type === "physical" && book.stockQuantity !== null) {
          await Book.updateOne({ _id: book._id }, { $inc: { stockQuantity: 1 } });
        }
        return res.status(400).json({ success: false, message: "Aapke paas itne coins nahi hain." });
      }
      user.coins -= cost;
      await user.save();
      await CoinTransaction.create({
        user: user._id,
        type: "redeem_book",
        amount: -cost,
        balanceAfter: user.coins,
        note: `Redeemed: ${book.title}`,
      });
    }

    const redemption = new BookRedemption({
      user: req.user._id,
      book: book._id,
      bookSnapshot: { title: book.title, type: book.type, coverImageUrl: book.coverImageUrl },
      coinsSpent: cost,
      status: book.type === "digital" ? "delivered" : "pending",
      shippingAddress: book.type === "physical" ? shippingAddress : undefined,
      digitalFileUrl: book.type === "digital" ? book.digitalFileUrl : "",
    });
    await redemption.save();

    return res.status(201).json({
      success: true,
      message: book.type === "digital" ? "Book unlock ho gayi!" : "Order place ho gaya!",
      data: {
        _id: redemption._id,
        status: redemption.status,
        digitalFileUrl: redemption.digitalFileUrl || undefined,
      },
    });
  } catch (error) {
    console.error("redeemBook error:", error);
    return res.status(500).json({ success: false, message: "Redeem karte waqt error aaya." });
  }
};
