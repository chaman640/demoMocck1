import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const STATUS_STYLES = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  shipped: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  delivered: "bg-green-500/15 text-green-400 border-green-500/30",
};

const STATUS_LABEL = { pending: "Pending", shipped: "Shipped", delivered: "Delivered" };

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const OrderCard = ({ order, onSaved }) => {
  const isPhysical = order.bookSnapshot.type === "physical";
  const [status, setStatus] = useState(order.status);
  const [tracking, setTracking] = useState(order.trackingInfo || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const dirty = status !== order.status || tracking !== (order.trackingInfo || "");
  const addr = order.shippingAddress || {};

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      await api.post(`/admin/book-orders/${order._id}/update`, { status, trackingInfo: tracking });
      setMsg("Saved");
      onSaved();
    } catch (err) {
      setMsg(err.response?.data?.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 space-y-3">
      <div className="flex gap-3">
        <div className="w-14 h-14 rounded-xl bg-[#0A0D14] flex-shrink-0 overflow-hidden flex items-center justify-center">
          {order.bookSnapshot.coverImageUrl ? (
            <img src={order.bookSnapshot.coverImageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">📘</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{order.bookSnapshot.title}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {isPhysical ? "📦 Physical" : "📄 Digital"} &middot; {order.coinsSpent > 0 ? `🪙 ${order.coinsSpent}` : "Free"} &middot; {formatDate(order.createdAt)}
          </p>
          <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full border font-semibold ${STATUS_STYLES[order.status]}`}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>
      </div>

      <div className="bg-[#0A0D14] rounded-xl p-3 text-xs space-y-0.5">
        <p className="text-white font-medium">{order.user?.name || "Student"}</p>
        {order.user?.phone && (
          <a href={`tel:${order.user.phone}`} className="text-[#A78BFA] block">{order.user.phone}</a>
        )}
        {order.user?.email && <p className="text-gray-500 truncate">{order.user.email}</p>}
      </div>

      {isPhysical && (
        <>
          <div className="bg-[#0A0D14] rounded-xl p-3 text-xs text-gray-300 space-y-0.5">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Delivery Address</p>
            <p className="text-white font-medium">{addr.name}{addr.phone ? ` · ${addr.phone}` : ""}</p>
            <p>{addr.addressLine}</p>
            <p>{[addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")}</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {["pending", "shipped", "delivered"].map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`py-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                  status === s ? STATUS_STYLES[s] : "bg-[#0A0D14] border-gray-800 text-gray-500"
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          <input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Courier / tracking number (optional)"
            className="w-full px-3 py-2.5 text-xs bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600"
          />

          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="flex-1 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-xs font-semibold disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            {msg && <span className="text-[11px] text-gray-400">{msg}</span>}
          </div>
        </>
      )}
    </div>
  );
};

const ManageBookOrders = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("loading");
  const [orders, setOrders] = useState([]);
  const [typeTab, setTypeTab] = useState("physical");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    try {
      const res = await api.get("/admin/book-orders");
      setOrders(res.data.data || []);
      setPhase("ready");
    } catch (err) {
      const status = err.response?.status;
      setPhase(status === 401 || status === 403 ? "noauth" : "error");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pendingCount = useMemo(
    () => orders.filter((o) => o.bookSnapshot.type === "physical" && o.status === "pending").length,
    [orders]
  );

  const visible = useMemo(
    () =>
      orders.filter((o) => {
        if (typeTab !== "all" && o.bookSnapshot.type !== typeTab) return false;
        if (typeTab === "physical" && statusFilter !== "all" && o.status !== statusFilter) return false;
        return true;
      }),
    [orders, typeTab, statusFilter]
  );

  if (phase === "noauth") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
        <div className="w-full max-w-sm bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center space-y-4">
          <div className="text-4xl">🔒</div>
          <p className="text-sm text-gray-300">Admin or Teacher login is required to view orders.</p>
          <div className="space-y-2">
            <Link to="/AdminLogin" className="block py-2.5 rounded-xl bg-[#7C3AED] text-sm font-semibold">Admin Login</Link>
            <Link to="/TeacherLogin" className="block py-2.5 rounded-xl border border-gray-700 text-sm text-gray-300">Teacher Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white pb-16">
      <header className="flex items-center justify-between px-4 py-3.5 border-b border-gray-800 sticky top-0 bg-[#0A0D14] z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 text-xl leading-none">←</button>
          <h1 className="text-base font-bold">Book Orders</h1>
        </div>
        <button
          onClick={() => navigate("/ManageBooks")}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-500"
        >
          📚 Books
        </button>
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: "physical", label: "📦 Physical", badge: pendingCount },
            { v: "digital", label: "📄 Digital" },
            { v: "all", label: "Sab" },
          ].map((t) => (
            <button
              key={t.v}
              onClick={() => setTypeTab(t.v)}
              className={`relative py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                typeTab === t.v ? "bg-[#7C3AED] border-[#7C3AED] text-white" : "bg-[#111827] border-gray-800 text-gray-400"
              }`}
            >
              {t.label}
              {t.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {typeTab === "physical" && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["all", "pending", "shipped", "delivered"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-semibold border ${
                  statusFilter === s ? "bg-white/10 border-white/30 text-white" : "border-gray-800 text-gray-500"
                }`}
              >
                {s === "all" ? "Sab" : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        )}

        {phase === "loading" && [1, 2].map((i) => <SkeletonBlock key={i} className="w-full h-56 rounded-2xl" />)}
        {phase === "error" && <p className="text-sm text-gray-500 text-center py-10">Could not load orders.</p>}

        {phase === "ready" && visible.length === 0 && (
          <div className="text-center py-14 space-y-2">
            <p className="text-4xl">📭</p>
            <p className="text-sm text-gray-500">No orders here yet.</p>
          </div>
        )}

        {phase === "ready" &&
          visible.map((order) => <OrderCard key={`${order._id}-${order.updatedAt}`} order={order} onSaved={load} />)}
      </main>
    </div>
  );
};

export default ManageBookOrders;
