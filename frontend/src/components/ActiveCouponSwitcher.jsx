import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

// Reusable component — teacher ke sabhi pages mein use hoga jahan
// "current working batch" ka context zaroori hai (question add, PYQ fill,
// student search, class analysis, etc.)
const ActiveCouponSwitcher = ({ activeCouponId, onChanged }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [role, setRole] = useState("main");

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const res = await api.get("/my-coupons");
      setCoupons(res.data.data || []);
      setRole(res.data.role || "main");
    } catch {
      // silent — dropdown khaali dikhega
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadCoupons();
  }, [open]);

  const activeCoupon = coupons.find((c) => c._id === activeCouponId);

  const handleSwitch = async (couponId) => {
    setSwitching(true);
    try {
      await api.post("/switch-active-coupon", { couponId });
      setOpen(false);
      if (onChanged) onChanged();
    } catch (err) {
      alert(err.response?.data?.message || "Switch nahi ho paaya.");
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 bg-[#111827] border border-gray-800 rounded-xl px-4 py-3 text-left hover:border-[#7C3AED]/50 transition-colors"
      >
        <div className="min-w-0">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Active Batch</p>
          <p className="text-sm font-semibold text-white truncate">
            {activeCoupon ? activeCoupon.name : "Koi batch select nahi"}
          </p>
        </div>
        <span className="text-gray-500 flex-shrink-0">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full bg-[#111827] border border-gray-800 rounded-xl shadow-xl max-h-72 overflow-y-auto">
          {loading ? (
            <p className="p-4 text-sm text-gray-500 text-center">Load ho raha hai...</p>
          ) : coupons.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500 mb-3">
                {role === "main" ? "Abhi koi coupon nahi bana." : "Aap kisi coupon ke liye authorized nahi hain."}
              </p>
              {role === "main" && (
                <button
                  onClick={() => navigate("/TeacherCoupons")}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9]"
                >
                  Coupon Banayein
                </button>
              )}
            </div>
          ) : (
            coupons.map((c) => (
              <button
                key={c._id}
                onClick={() => handleSwitch(c._id)}
                disabled={switching}
                className={`w-full text-left px-4 py-3 border-b border-gray-800 last:border-0 hover:bg-[#1F2937] transition-colors ${
                  c._id === activeCouponId ? "bg-[#7C3AED]/10" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white truncate">{c.name}</p>
                  {c._id === activeCouponId && <span className="text-[#A78BFA] text-xs flex-shrink-0">✓</span>}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {c.exam} &middot; {c.code}
                  {c.subjects && ` · ${c.subjects.join(", ")}`}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ActiveCouponSwitcher;