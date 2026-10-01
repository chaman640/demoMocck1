import Book from "../models/Book.js";
import BookRedemption from "../models/BookRedemption.js";
import User from "../models/User.js";
import CoinTransaction from "../models/CoinTransaction.js";
import { COIN_CONFIG } from "../utils/coinRewards.js";

const clean = (v) => (typeof v === "string" || typeof v === "number" ? String(v).trim() : "");

const readAddress = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const address = {
    name: clean(raw.name),
    phone: clean(raw.phone),
    addressLine: clean(raw.addressLine),
    city: clean(raw.city),
    state: clean(raw.state),
    pincode: clean(raw.pincode),
  };
  return Object.values(address).every(Boolean) ? address : null;
};

export const redeemBook = async (req, res) => {
  const undo = { stock: false, coins: 0, freeClaim: false };
  const userId = req.user._id;
  const { bookId } = req.params;

  const rollback = async () => {
    const tasks = [];
    if (undo.stock) tasks.push(Book.updateOne({ _id: bookId }, { $inc: { stockQuantity: 1 } }));
    if (undo.coins > 0) tasks.push(User.updateOne({ _id: userId }, { $inc: { coins: undo.coins } }));
    if (undo.freeClaim) tasks.push(User.updateOne({ _id: userId }, { $inc: { freePhysicalClaims: -1 } }));
    await Promise.allSettled(tasks);
  };

  const fail = async (status, message) => {
    await rollback();
    return res.status(status).json({ success: false, message });
  };

  try {
    const book = await Book.findOne({ _id: bookId, status: "active" });
    if (!book) return fail(404, "Ye book available nahi hai.");

    if (await BookRedemption.exists({ user: userId, book: book._id })) {
      return fail(400, "Aap ye book pehle hi le chuke hain.");
    }

    const cost = book.isFree ? 0 : book.coinCost;
    let address = null;

    if (book.type === "physical") {
      address = readAddress(req.body?.shippingAddress);
      if (!address) {
        return fail(400, "Physical book ke liye poora address (naam, phone, address, city, state, pincode) bharna zaroori hai.");
      }
      if (!/^\d{6}$/.test(address.pincode)) return fail(400, "Pincode 6 anko ka hona chahiye.");
      if (!/^\d{10}$/.test(address.phone)) return fail(400, "Phone number 10 anko ka hona chahiye.");

      if (book.isFree) {
        const claimed = await User.findOneAndUpdate(
          {
            _id: userId,
            $or: [
              { freePhysicalClaims: { $exists: false } },
              { freePhysicalClaims: { $lt: COIN_CONFIG.FREE_PHYSICAL_BOOK_LIMIT } },
            ],
          },
          { $inc: { freePhysicalClaims: 1 } },
          { new: true, projection: { freePhysicalClaims: 1 } }
        );
        if (!claimed) {
          return fail(400, `Free physical book sirf ${COIN_CONFIG.FREE_PHYSICAL_BOOK_LIMIT} baar li ja sakti hai.`);
        }
        undo.freeClaim = true;
      }

      if (book.stockQuantity !== null && book.stockQuantity !== undefined) {
        const reserved = await Book.findOneAndUpdate(
          { _id: book._id, stockQuantity: { $gt: 0 } },
          { $inc: { stockQuantity: -1 } },
          { new: true, projection: { stockQuantity: 1 } }
        );
        if (!reserved) return fail(400, "Ye book stock mein nahi hai.");
        undo.stock = true;
      }
    }

    let balanceAfter = null;
    if (cost > 0) {
      const charged = await User.findOneAndUpdate(
        { _id: userId, coins: { $gte: cost } },
        { $inc: { coins: -cost } },
        { new: true, projection: { coins: 1 } }
      );
      if (!charged) return fail(400, "Aapke paas itne coins nahi hain.");
      undo.coins = cost;
      balanceAfter = charged.coins;
    }

    const redemption = new BookRedemption({
      user: userId,
      book: book._id,
      bookSnapshot: { title: book.title, type: book.type, coverImageUrl: book.coverImageUrl },
      coinsSpent: cost,
      status: book.type === "digital" ? "delivered" : "pending",
      shippingAddress: address || undefined,
    });

    try {
      await redemption.save();
    } catch (saveError) {
      if (saveError?.code === 11000) return fail(400, "Aap ye book pehle hi le chuke hain.");
      throw saveError;
    }

    if (cost > 0) {
      try {
        await CoinTransaction.create({
          user: userId,
          type: "redeem_book",
          amount: -cost,
          balanceAfter,
          note: `Redeemed: ${book.title}`,
        });
      } catch (ledgerError) {
        console.error("redeemBook ledger write failed:", ledgerError.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: book.type === "digital" ? "Book unlock ho gayi!" : "Order place ho gaya!",
      data: {
        _id: redemption._id,
        status: redemption.status,
        title: book.title,
        bookId: book._id,
        readInApp: book.type === "digital",
      },
    });
  } catch (error) {
    console.error("redeemBook error:", error);
    await rollback();
    return res.status(500).json({ success: false, message: "Redeem karte waqt error aaya." });
  }
};
