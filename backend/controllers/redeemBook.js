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
    if (!book) return fail(404, "This book is not available.");

    if (await BookRedemption.exists({ user: userId, book: book._id })) {
      return fail(400, "You have already taken this book.");
    }

    const cost = book.isFree ? 0 : book.coinCost;
    let address = null;

    if (book.type === "physical") {
      address = readAddress(req.body?.shippingAddress);
      if (!address) {
        return fail(400, "A full address (name, phone, address, city, state, pincode) is required for a physical book.");
      }
      if (!/^\d{6}$/.test(address.pincode)) return fail(400, "Pincode must be 6 digits.");
      if (!/^\d{10}$/.test(address.phone)) return fail(400, "Phone number must be 10 digits.");

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
          return fail(400, `A free physical book can be taken only ${COIN_CONFIG.FREE_PHYSICAL_BOOK_LIMIT} time(s).`);
        }
        undo.freeClaim = true;
      }

      if (book.stockQuantity !== null && book.stockQuantity !== undefined) {
        const reserved = await Book.findOneAndUpdate(
          { _id: book._id, stockQuantity: { $gt: 0 } },
          { $inc: { stockQuantity: -1 } },
          { new: true, projection: { stockQuantity: 1 } }
        );
        if (!reserved) return fail(400, "This book is out of stock.");
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
      if (!charged) return fail(400, "You do not have enough coins.");
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
      if (saveError?.code === 11000) return fail(400, "You have already taken this book.");
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
      message: book.type === "digital" ? "Book unlocked!" : "Order placed!",
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
    return res.status(500).json({ success: false, message: "Error while redeeming." });
  }
};
