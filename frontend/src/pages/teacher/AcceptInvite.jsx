import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api";

const AcceptInvite = () => {
  const navigate = useNavigate();
  const { token } = useParams();

  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: false }));
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const errors = {};

    if (!formData.name.trim()) errors.name = true;
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) errors.email = true;
    if (formData.password.length < 6) errors.password = true;
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = true;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Kripya highlighted fields sahi se bharein.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/accept-invite", {
        token,
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
      navigate("/TeacherDashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invite accept nahi ho paaya.");
    } finally {
      setLoading(false);
    }
  };

  const getInputClass = (fieldName) =>
    `w-full px-4 py-2.5 text-sm bg-[#0A0D14] border rounded-xl outline-none transition-colors text-white placeholder-gray-600 ${
      fieldErrors[fieldName] ? "border-red-500" : "border-gray-700 focus:border-[#7C3AED]"
    }`;

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-full bg-green-500/10 text-green-400 flex items-center justify-center text-2xl mb-4">
            🎉
          </div>
          <h1 className="text-2xl font-bold">Sub-Teacher Invite</h1>
          <p className="text-gray-400 text-sm mt-1">
            Apna account activate karne ke liye details bharein
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
                Full Name
              </label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Aapka naam" className={getInputClass("name")} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                Email
              </label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@example.com" className={getInputClass("email")} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                Password Set Karein
              </label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••" className={getInputClass("password")} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                Confirm Password
              </label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••" className={getInputClass("confirmPassword")} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? "Activate ho raha hai..." : "Account Activate Karein"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;