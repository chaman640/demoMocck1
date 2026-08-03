import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/api";

const TeacherSignup = () => {
  const navigate = useNavigate();
  const [examList, setExamList] = useState([]);
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "", examName: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/allExamName")
      .then((res) => setExamList(res.data.data || []))
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: false }));
    if (name === "phone") {
      const onlyNums = value.replace(/[^0-9]/g, "");
      if (onlyNums.length <= 10) setFormData((prev) => ({ ...prev, phone: onlyNums }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const errors = {};

    if (!formData.name.trim()) errors.name = true;
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) errors.email = true;
    if (formData.phone.length !== 10) errors.phone = true;
    if (formData.password.length < 6) errors.password = true;
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = true;
    if (!formData.examName) errors.examName = true;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Kripya highlighted fields sahi se bharein.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/teacher-signup", {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone,
        password: formData.password,
        examName: formData.examName,
      });
      navigate("/TeacherDashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Signup fail ho gaya.");
    } finally {
      setLoading(false);
    }
  };

  const getInputClass = (fieldName) =>
    `w-full px-4 py-2.5 text-sm bg-[#0A0D14] border rounded-xl outline-none transition-colors text-white placeholder-gray-600 ${
      fieldErrors[fieldName] ? "border-red-500" : "border-gray-700 focus:border-[#7C3AED]"
    }`;

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center font-bold text-lg mb-4">
            mt
          </div>
          <h1 className="text-2xl font-bold">Main Teacher Signup</h1>
          <p className="text-gray-400 text-sm mt-1">
            Apna institute/batch shuru karein
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
                Phone
              </label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="10 digit number" className={getInputClass("phone")} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                  Password
                </label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••" className={getInputClass("password")} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                  Confirm
                </label>
                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••" className={getInputClass("confirmPassword")} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                Primary Exam
              </label>
              <select
                name="examName"
                value={formData.examName}
                onChange={handleChange}
                className={`${getInputClass("examName")} appearance-none cursor-pointer`}
              >
                <option value="" disabled>Select exam</option>
                {examList.map((e, i) => (
                  <option key={i} value={e}>{e}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? "Account ban raha hai..." : "Account Banayein"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            Already account hai?{" "}
            <Link to="/TeacherLogin" className="text-[#A78BFA] font-medium hover:underline">
              Login
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Sub-Teacher ho? Aapko Main Teacher se invite link milega — sign up ki zarurat nahi.
        </p>
      </div>
    </div>
  );
};

export default TeacherSignup;