import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { vibrateShort } from "../utils/vibrate";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const ShippingForm = ({ onCancel, onConfirm, submitting }) => {
  const [form, setForm] = useState({ name: "", phone: "", addressLine: "", city: "", state: "", pincode: "" });

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
      <div className="bg-[#111827] border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg mb-1">Delivery Address</h3>
        <p className="text-xs text-gray-500 mb-4">Ye book aapke address par bheji jayegi.</p>
        <div className="space-y-3">
          <input name="name" value={form.name} onChange={handleChange} placeholder="Poora Naam" className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600" />
          <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone Number" maxLength={10} className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600" />
          <textarea name="addressLine" value={form.addressLine} onChange={handleChange} placeholder="Ghar/Gali/Mohalla" rows={2} className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600 resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <input name="city" value={form.city} onChange={handleChange} placeholder="Shahar" className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600" />
            <input name="state" value={form.state} onChange={handleChange} placeholder="Rajya" className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600" />
          </div>
          <input name="pincode" value={form.pincode} onChange={handleChange} placeholder="Pincode" maxLength={6} className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600" />
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 text-sm font-medium">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(form)}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? "Bhej rahe hain..." : "Confirm Karein"}
          </button>
        </div>
      </div>
    </div>
  );
};

const BookCard = ({ book, onRedeemClick, redeeming }) => {
  const disabled = book.alreadyRedeemed || !book.inStock;
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden flex flex-col">
      <div className="aspect-[4/3] bg-[#0A0D14] flex items-center justify-center overflow-hidden">
        {book.coverImageUrl ? (
          <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl">📘</span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
            {book.type === "digital" ? "📄 Digital" : "📦 Physical"}
          </span>
          {book.isFree ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 font-semibold">
              FREE
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
              🪙 {book.coinCost}
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold text-white leading-tight mb-1 line-clamp-2">{book.title}</h3>
        {book.description && (
          <p className="text-[11px] text-gray-500 line-clamp-2 mb-3 flex-1">{book.description}</p>
        )}
        {!book.inStock && !book.alreadyRedeemed && (
          <p className="text-[11px] text-red-400 mb-2">Stock khatam</p>
        )}
        <button
          onClick={() => onRedeemClick(book)}
          disabled={disabled || redeeming}
          className={`mt-auto w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
            book.alreadyRedeemed
              ? "bg-gray-800 text-gray-500 cursor-not-allowed"
              : disabled
              ? "bg-gray-800 text-gray-500 cursor-not-allowed"
              : "bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
          }`}
        >
          {book.alreadyRedeemed ? "Le Chuke Hain" : !book.inStock ? "Out of Stock" : "Redeem Karein"}
        </button>
      </div>
    </div>
  );
};

const RewardsStore = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("loading");
  const [books, setBooks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pendingBook, setPendingBook] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState("");
  const [boosting, setBoosting] = useState(false);

  const loadAll = async () => {
    try {
      const [booksRes, summaryRes] = await Promise.all([
        api.get("/rewards/books"),
        api.get("/rewards/summary"),
      ]);
      setBooks(booksRes.data.data || []);
      setSummary(summaryRes.data.data);
      setPhase("ready");
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/Login");
        return;
      }
      setPhase("error");
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRedeemClick = (book) => {
    setMessage("");
    if (book.type === "physical") {
      setPendingBook(book);
    } else {
      confirmRedeem(book, null);
    }
  };

  const confirmRedeem = async (book, shippingAddress) => {
    setRedeeming(true);
    try {
      const res = await api.post(`/rewards/books/${book._id}/redeem`, { shippingAddress });
      setMessage(res.data.message || "Redeem ho gaya!");
      setPendingBook(null);
      vibrateShort();
      await loadAll();
      if (res.data.data?.digitalFileUrl) {
        window.open(res.data.data.digitalFileUrl, "_blank");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Redeem nahi ho paya.");
    } finally {
      setRedeeming(false);
    }
  };

  const handleBoost = async () => {
    setBoosting(true);
    try {
      const res = await api.post("/rewards/watch-ad-boost");
      setMessage(res.data.message);
      vibrateShort();
      await loadAll();
    } catch (err) {
      setMessage(err.response?.data?.message || "Boost activate nahi ho paya.");
    } finally {
      setBoosting(false);
    }
  };

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <SkeletonBlock className="w-40 h-7" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonBlock key={i} className="w-full h-52 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-gray-300">Kuch galat ho gaya.</p>
          <button onClick={loadAll} className="px-5 py-2 rounded-lg bg-[#7C3AED] text-sm font-medium">
            Dobara Try Karein
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white pb-16">
      <header className="flex items-center justify-between px-4 py-3.5 border-b border-gray-800 sticky top-0 bg-[#0A0D14] z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 text-xl leading-none">
            ←
          </button>
          <h1 className="text-base font-bold">Rewards Store</h1>
        </div>
        <button
          onClick={() => navigate("/MyRedemptions")}
          className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-full px-3 py-1.5"
        >
          <span className="text-sm">🪙</span>
          <span className="text-sm font-bold text-amber-300">{summary?.coins ?? 0}</span>
        </button>
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto space-y-5">
        {message && (
          <div className="p-3 bg-[#111827] border border-gray-800 rounded-xl text-sm text-center">{message}</div>
        )}

        <section className="bg-gradient-to-br from-cyan-500/15 to-[#111827] border border-cyan-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-cyan-300 flex items-center gap-1.5">⚡ 2x Coin Boost</p>
            {summary?.boostActive ? (
              <p className="text-xs text-gray-400 mt-0.5">
                Active hai — {Math.ceil((summary.boostRemainingSeconds || 0) / 60)} minute baaki
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">Agla test double coins dega</p>
            )}
          </div>
          <button
            onClick={handleBoost}
            disabled={boosting}
            className="flex-shrink-0 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold disabled:opacity-50"
          >
            {boosting ? "..." : summary?.boostActive ? "Aur Badhayein" : "Boost Activate Karein"}
          </button>
        </section>

        <section>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-2.5">
            Books ({books.length})
          </p>
          {books.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">Abhi koi book available nahi hai.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {books.map((book) => (
                <BookCard key={book._id} book={book} onRedeemClick={handleRedeemClick} redeeming={redeeming} />
              ))}
            </div>
          )}
        </section>
      </main>

      {pendingBook && (
        <ShippingForm
          submitting={redeeming}
          onCancel={() => setPendingBook(null)}
          onConfirm={(address) => confirmRedeem(pendingBook, address)}
        />
      )}
    </div>
  );
};

export default RewardsStore;
