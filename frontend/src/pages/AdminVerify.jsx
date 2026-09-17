import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";

const AdminVerify = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setError("Login link mein token missing hai.");
      return;
    }

    api
      .post("/admin/verify-login", { token })
      .then(() => {
        setStatus("success");
        setTimeout(() => navigate("/AdminPanel"), 1200);
      })
      .catch((err) => {
        setStatus("error");
        setError(err.response?.data?.message || "Login verify nahi ho paaya.");
      });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        {status === "verifying" && (
          <>
            <div className="w-10 h-10 mx-auto border-4 border-gray-700 border-t-[#8B5CF6] rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-400">Login verify ho raha hai...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-green-500/10 text-green-400 flex items-center justify-center text-2xl mb-4">✅</div>
            <p className="text-sm text-gray-300">Login ho gaya! Admin panel khul raha hai...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 text-red-400 flex items-center justify-center text-2xl mb-4">✕</div>
            <p className="text-sm text-gray-300 mb-6">{error}</p>
            <button onClick={() => navigate("/AdminLogin")} className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">
              Naya Link Mangwayein
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminVerify;
