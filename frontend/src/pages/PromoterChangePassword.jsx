import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import api from "../api/api";

const PromoterChangePassword = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError("Sabhi fields bharna zaroori hai!");
      return;
    }
    if (form.newPassword.length < 6) {
      setError("Naya password kam se kam 6 characters ka hona chahiye!");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Naya password aur confirm password match nahi kar rahe!");
      return;
    }

    setLoading(true);
    try {
      await api.post("/promoter/change-password", form);
      queryClient.removeQueries({ queryKey: ["promoter-dashboard"] });
      navigate("/PromoterDashboard");
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/PromoterLogin");
        return;
      }
      setError(err.response?.data?.message || "Password badalne mein error aaya.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Naya Password Set Karein</h1>
          <p className="text-gray-400 text-sm mt-1">
            Pehli baar login kiya hai — aage badhne se pehle apna password badal lein
          </p>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3 bg-red-500/10 text-red-400 border border-red-500/25 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                Current Password
              </label>
              <input
                type="password"
                name="currentPassword"
                value={form.currentPassword}
                onChange={handleChange}
                placeholder="Jo password email mein mila tha"
                className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none transition-colors text-white placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                Naya Password
              </label>
              <input
                type="password"
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none transition-colors text-white placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                Naya Password (Confirm)
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none transition-colors text-white placeholder-gray-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? "Save ho raha hai..." : "Password Badlein"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PromoterChangePassword;
