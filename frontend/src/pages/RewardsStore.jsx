import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import api from "../api/api";
import { vibrateShort } from "../utils/vibrate";
import { emitBoostActivated } from "../utils/rewardEvents";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const inputCls =
  "w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600";

const ShippingForm = ({ book, coins, error, onCancel, onConfirm, submitting }) => {
  const [form, setForm] = useState({ name: "", phone: "", addressLine: "", city: "", state: "", pincode: "" });
  const [localError, setLocalError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setLocalError("");
  };

  const submit = () => {
    const trimmed = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]));
    if (Object.values(trimmed).some((v) => !v)) return setLocalError("Sabhi fields bharna zaroori hai.");
    if (!/^\d{10}$/.test(trimmed.phone)) return setLocalError("Phone number 10 anko ka hona chahiye.");
    if (!/^\d{6}$/.test(trimmed.pincode)) return setLocalError("Pincode 6 anko ka hona chahiye.");
    onConfirm(trimmed);
  };

  const shownError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4">
      <div className="bg-[#111827] border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg mb-1">Delivery Address</h3>
        <p className="text-xs text-gray-500 mb-3">
          {book.title} &middot; {book.isFree ? "Free" : `🪙 ${book.coinCost} coins kharch honge (aapke paas ${coins})`}
        </p>

        {shownError && (
          <div className="mb-3 p-3 bg-red-500/10 text-red-400 border border-red-500/25 rounded-xl text-xs text-center">
            {shownError}
          </div>
        )}

        <div className="space-y-3">
          <input name="name" value={form.name} onChange={handleChange} placeholder="Poora Naam" className={inputCls} />
          <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone Number" inputMode="numeric" maxLength={10} className={inputCls} />
          <textarea name="addressLine" value={form.addressLine} onChange={handleChange} placeholder="Ghar/Gali/Mohalla" rows={2} className={`${inputCls} resize-none`} />
          <div className="grid grid-cols-2 gap-3">
            <input name="city" value={form.city} onChange={handleChange} placeholder="Shahar" className={inputCls} />
            <input name="state" value={form.state} onChange={handleChange} placeholder="Rajya" className={inputCls} />
          </div>
          <input name="pincode" value={form.pincode} onChange={handleChange} placeholder="Pincode" inputMode="numeric" maxLength={6} className={inputCls} />
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} disabled={submitting} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 text-sm font-medium disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={submit}
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

const ConfirmSheet = ({ book, coins, submitting, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4">
    <div className="bg-[#111827] border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5">
      <h3 className="font-bold text-lg mb-1">Redeem karein?</h3>
      <p className="text-sm text-gray-300 mb-4">{book.title}</p>
      <div className="bg-[#0A0D14] rounded-xl p-3 text-sm space-y-1.5 mb-4">
        <div className="flex justify-between"><span className="text-gray-500">Kharch</span><span className="text-amber-300 font-bold">🪙 {book.coinCost}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Abhi aapke paas</span><span>🪙 {coins}</span></div>
        <div className="flex justify-between border-t border-gray-800 pt-1.5"><span className="text-gray-500">Baad mein bachenge</span><span className="font-semibold">🪙 {coins - book.coinCost}</span></div>
      </div>
      <div className="flex gap-3">
        <button onClick={onCancel} disabled={submitting} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 text-sm font-medium disabled:opacity-50">
          Nahi
        </button>
        <button onClick={onConfirm} disabled={submitting} className="flex-1 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-semibold disabled:opacity-50">
          {submitting ? "Ho raha hai..." : "Haan, Redeem Karein"}
        </button>
      </div>
    </div>
  </div>
);

const getButtonState = (book, coins) => {
  if (book.alreadyRedeemed) return { label: "Le Chuke Hain", disabled: true };
  if (!book.inStock) return { label: "Out of Stock", disabled: true };
  if (book.freeLimitReached) return { label: "Free limit poori ho gayi", disabled: true };
  if (!book.isFree && coins < book.coinCost) return { label: `${book.coinCost - coins} coins aur chahiye`, disabled: true };
  return { label: "Redeem Karein", disabled: false };
};

const BookCard = ({ book, coins, onRedeemClick, busy }) => {
  const state = getButtonState(book, coins);
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
        {book.description && <p className="text-[11px] text-gray-500 line-clamp-2 mb-3 flex-1">{book.description}</p>}
        <button
          onClick={() => onRedeemClick(book)}
          disabled={state.disabled || busy}
          className={`mt-auto w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
            state.disabled || busy ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
          }`}
        >
          {state.label}
        </button>
      </div>
    </div>
  );
};

const RewardsStore = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState("loading");
  const [books, setBooks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pendingBook, setPendingBook] = useState(null);
  const [confirmBook, setConfirmBook] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [download, setDownload] = useState(null);
  const [boosting, setBoosting] = useState(false);

  const coins = summary?.coins ?? 0;

  const loadAll = async () => {
    try {
      const [booksRes, summaryRes] = await Promise.all([api.get("/rewards/books"), api.get("/rewards/summary")]);
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

  const refreshEverywhere = async () => {
    queryClient.invalidateQueries({ queryKey: ["rewards-summary"] });
    await loadAll();
  };

  const doRedeem = async (book, shippingAddress) => {
    setRedeeming(true);
    setFormError("");
    try {
      const res = await api.post(`/rewards/books/${book._id}/redeem`, { shippingAddress });
      setPendingBook(null);
      setConfirmBook(null);
      vibrateShort();
      if (res.data.data?.readInApp) {
        setMessage("");
        setDownload({ title: res.data.data.title || book.title, bookId: res.data.data.bookId || book._id });
      } else {
        setDownload(null);
        setMessage(res.data.message || "Order place ho gaya!");
      }
      await refreshEverywhere();
    } catch (err) {
      const msg = err.response?.data?.message || "Redeem nahi ho paya.";
      if (book.type === "physical") {
        setFormError(msg);
      } else {
        setConfirmBook(null);
        setMessage(msg);
      }
      if (err.response?.status === 400) await refreshEverywhere();
    } finally {
      setRedeeming(false);
    }
  };

  const handleRedeemClick = (book) => {
    setMessage("");
    setDownload(null);
    setFormError("");
    if (book.type === "physical") setPendingBook(book);
    else if (!book.isFree) setConfirmBook(book);
    else doRedeem(book, null);
  };

  const handleBoost = async () => {
    setBoosting(true);
    setDownload(null);
    try {
      const res = await api.post("/rewards/watch-ad-boost");
      setMessage(res.data.message);
      emitBoostActivated(Math.round((res.data.data?.boostRemainingSeconds || 2700) / 60));
      await refreshEverywhere();
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/MyRedemptions")}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-700 text-gray-300"
          >
            My Orders
          </button>
          <span className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-full px-3 py-1.5">
            <span className="text-sm">🪙</span>
            <span className="text-sm font-bold text-amber-300">{coins}</span>
          </span>
        </div>
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto space-y-5">
        {download && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-green-400">✅ Unlock ho gayi!</p>
              <p className="text-xs text-gray-400 truncate">{download.title} — My Orders mein bhi milegi</p>
            </div>
            <button
              onClick={() => navigate(`/Reader/book/${download.bookId}`)}
              className="flex-shrink-0 px-4 py-2 rounded-xl bg-green-500 text-black text-xs font-bold"
            >
              Padhein
            </button>
          </div>
        )}

        {message && <div className="p-3 bg-[#111827] border border-gray-800 rounded-xl text-sm text-center">{message}</div>}

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
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-2.5">Books ({books.length})</p>
          {books.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">Abhi koi book available nahi hai.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {books.map((book) => (
                <BookCard key={book._id} book={book} coins={coins} onRedeemClick={handleRedeemClick} busy={redeeming} />
              ))}
            </div>
          )}
        </section>
      </main>

      {pendingBook && (
        <ShippingForm
          book={pendingBook}
          coins={coins}
          error={formError}
          submitting={redeeming}
          onCancel={() => {
            setPendingBook(null);
            setFormError("");
          }}
          onConfirm={(address) => doRedeem(pendingBook, address)}
        />
      )}

      {confirmBook && (
        <ConfirmSheet
          book={confirmBook}
          coins={coins}
          submitting={redeeming}
          onCancel={() => setConfirmBook(null)}
          onConfirm={() => doRedeem(confirmBook, null)}
        />
      )}
    </div>
  );
};

export default RewardsStore;
