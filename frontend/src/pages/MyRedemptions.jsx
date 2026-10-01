import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const STATUS_STYLES = {
  delivered: "bg-green-500/15 text-green-400 border-green-500/30",
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  shipped: "bg-blue-500/15 text-blue-300 border-blue-500/30",
};

const STATUS_LABEL = {
  delivered: "Delivered",
  pending: "Pending",
  shipped: "Shipped",
};

const OrderCard = ({ order }) => (
  <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 flex gap-3">
    <div className="w-16 h-16 rounded-xl bg-[#0A0D14] flex-shrink-0 flex items-center justify-center overflow-hidden">
      {order.coverImageUrl ? (
        <img src={order.coverImageUrl} alt={order.title} className="w-full h-full object-cover" />
      ) : (
        <span className="text-2xl">📘</span>
      )}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-white truncate">{order.title}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">
        {order.type === "digital" ? "Digital" : "Physical"} &middot;{" "}
        {order.coinsSpent > 0 ? `${order.coinsSpent} coins` : "Free"}
      </p>
      <div className="flex items-center gap-2 mt-2">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${STATUS_STYLES[order.status]}`}>
          {STATUS_LABEL[order.status]}
        </span>
        {order.trackingInfo && <span className="text-[11px] text-gray-500">{order.trackingInfo}</span>}
      </div>
      {order.readInApp && order.bookId && (
        <Link
          to={`/Reader/book/${order.bookId}`}
          className="inline-block mt-2 text-xs font-semibold text-[#A78BFA] hover:underline"
        >
          App mein padhein (offline bhi) →
        </Link>
      )}
    </div>
  </div>
);

const MyRedemptions = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("loading");
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api
      .get("/rewards/my-redemptions")
      .then((res) => {
        setOrders(res.data.data || []);
        setPhase("ready");
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          navigate("/Login");
          return;
        }
        setPhase("error");
      });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white pb-16">
      <header className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-xl leading-none">
          ←
        </button>
        <h1 className="text-base font-bold">My Orders</h1>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-3">
        {phase === "loading" &&
          [1, 2, 3].map((i) => <SkeletonBlock key={i} className="w-full h-24 rounded-2xl" />)}

        {phase === "error" && (
          <p className="text-sm text-gray-500 text-center py-10">Orders load nahi ho paye.</p>
        )}

        {phase === "ready" && orders.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <p className="text-4xl">📦</p>
            <p className="text-sm text-gray-500">Abhi tak koi book redeem nahi ki hai.</p>
            <button
              onClick={() => navigate("/RewardsStore")}
              className="px-5 py-2 rounded-lg bg-[#7C3AED] text-sm font-medium"
            >
              Rewards Store Kholein
            </button>
          </div>
        )}

        {phase === "ready" && orders.map((order) => <OrderCard key={order._id} order={order} />)}
      </main>
    </div>
  );
};

export default MyRedemptions;
