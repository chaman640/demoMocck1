import React, { useState } from "react";
import api from "../api/api";

// 🆕 Naya logo (BatchMock.in rebrand)
const LOGO_URL = "/logo.svg";

const AdminLogin = () => {
  const [status, setStatus] = useState("idle"); // idle | sending | sent
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleSendLink = async () => {
    setStatus("sending");
    setError("");
    try {
      await api.post("/admin/request-login");
      setStatus("sent");
      setCooldown(60);
    } catch (err) {
      setError(err.response?.data?.message || "Login link bhejte waqt error aaya.");
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="AntimPrayash.in" className="w-12 h-12 mx-auto object-contain rounded-xl mb-4" />
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="text-gray-400 text-sm mt-1">Koi password nahi — email par login link jayega</p>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3 bg-red-500/10 text-red-400 border border-red-500/25 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          {status !== "sent" ? (
            <>
              <p className="text-sm text-gray-400 mb-6 text-center">
                Button dabate hi admin email par ek login link jayega. Us link par click karke 12 ghante ke liye admin panel access ho jayega.
              </p>
              <button
                onClick={handleSendLink}
                disabled={status === "sending" || cooldown > 0}
                className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold transition-colors disabled:opacity-50"
              >
                {status === "sending" ? "Bhej rahe hain..." : cooldown > 0 ? `Dobara bhejein (${cooldown}s)` : "Login Link Bhejein"}
              </button>
            </>
          ) : (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-green-500/10 text-green-400 flex items-center justify-center text-2xl mb-4">
                📧
              </div>
              <p className="text-sm text-gray-300 mb-2">Login link bhej diya gaya hai!</p>
              <p className="text-xs text-gray-500 mb-6">Admin email ka inbox check karein aur link par click karein. Link 15 minute mein expire ho jayega.</p>
              <button
                onClick={handleSendLink}
                disabled={cooldown > 0}
                className="text-xs text-[#A78BFA] hover:underline disabled:text-gray-600 disabled:no-underline"
              >
                {cooldown > 0 ? `Dobara bhejein (${cooldown}s)` : "Dobara Bhejein"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
