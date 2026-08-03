import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/api";

const TeacherLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.identifier.trim() || !formData.password) {
      setError("Email/Phone aur password dono zaroori hain!");
      return;
    }

    const isEmail = formData.identifier.includes("@");
    const payload = isEmail
      ? { email: formData.identifier.trim(), password: formData.password }
      : { phone: formData.identifier.trim(), password: formData.password };

    setLoading(true);
    try {
      await api.post("/teacher-login", payload);
      navigate("/TeacherDashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login fail ho gaya.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center font-bold text-lg mb-4">
            mt
          </div>
          <h1 className="text-2xl font-bold">Teacher Login</h1>
          <p className="text-gray-400 text-sm mt-1">Apne teacher account mein login karein</p>
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
                Email ya Phone
              </label>
              <input
                type="text"
                name="identifier"
                value={formData.identifier}
                onChange={handleChange}
                placeholder="email@example.com ya 9876543210"
                className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none transition-colors text-white placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none transition-colors text-white placeholder-gray-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? "Login ho raha hai..." : "Login Karein"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            Naya Main Teacher account?{" "}
            <Link to="/TeacherSignup" className="text-[#A78BFA] font-medium hover:underline">
              Sign Up
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Student ho?{" "}
          <Link to="/Login" className="text-gray-400 hover:underline">
            Student Login yahan
          </Link>
        </p>
      </div>
    </div>
  );
};

export default TeacherLogin;