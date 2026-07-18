import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const ProfileSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12 pb-24">
    <div className="max-w-lg mx-auto">
      <SkeletonBlock className="w-24 h-4 mb-6" />
      <div className="flex flex-col items-center mb-8">
        <SkeletonBlock className="w-20 h-20 rounded-full mb-4" />
        <SkeletonBlock className="w-40 h-6 mb-2" />
        <SkeletonBlock className="w-28 h-5 rounded-full" />
      </div>
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 space-y-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <SkeletonBlock className="w-20 h-3 mb-2" />
            <SkeletonBlock className="w-48 h-4" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const FIELD_LABELS = {
  email: "Email Address",
  phone: "Phone Number",
  address: "City / Address",
  exam: "Exam Category",
};

// 👇 NAYA: HomePage jaisa hi bottom nav — teeno pages ke button
const navBtnClass =
  "flex flex-col items-center justify-center gap-1 w-1/3 text-gray-300 active:text-[#A78BFA] transition-colors";

const BottomNav = ({ navigate }) => (
  <nav className="fixed bottom-0 left-0 w-full h-[70px] bg-[#111827] border-t border-gray-800 flex justify-around items-center z-50">
    <button onClick={() => navigate('/MockTest')} className={navBtnClass}>
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
      <span className="text-xs font-medium">Mock Tests</span>
    </button>

    <button onClick={() => navigate('/UserAllAnalysis')} className={navBtnClass}>
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <span className="text-xs font-medium">Analysis</span>
    </button>

    <button onClick={() => navigate('/ProfilePage')} className={navBtnClass}>
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <span className="text-xs font-medium">Profile</span>
    </button>
  </nav>
);

const ProfilePage = () => {
  const navigate = useNavigate();

  const [phase, setPhase] = useState("loading"); // loading | view | editing | saving | error
  const [user, setUser] = useState(null);
  const [examList, setExamList] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    exam: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setPhase("loading");
      try {
        const [meRes, examRes] = await Promise.all([
          api.get("/me"),
          api.get("/allExamName").catch(() => ({ data: { data: [] } })),
        ]);
        if (cancelled) return;
        const u = meRes.data.data;
        setUser(u);
        setFormData({
          name: u.name || "",
          email: u.email || "",
          phone: u.phone || "",
          address: u.address || "",
          exam: u.exam || "",
        });
        setExamList(examRes.data.data || []);
        setPhase("view");
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 401) {
          navigate("/Login");
          return;
        }
        setErrorMsg(err.response?.data?.message || "Profile load nahi ho paayi.");
        setPhase("error");
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = () => {
    setFieldErrors({});
    setErrorMsg("");
    setSuccessMsg("");
    setPhase("editing");
  };

  const cancelEdit = () => {
    setFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || "",
      exam: user.exam || "",
    });
    setFieldErrors({});
    setErrorMsg("");
    setPhase("view");
  };

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

  const handleSave = async () => {
    setErrorMsg("");
    const errors = {};
    if (!formData.name.trim()) errors.name = true;
    if (!formData.address.trim()) errors.address = true;
    if (formData.phone.length !== 10) errors.phone = true;
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) errors.email = true;
    if (!formData.exam) errors.exam = true;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMsg("Kripya highlighted fields sahi se bharein.");
      return;
    }

    setPhase("saving");
    try {
      const res = await api.post("/user-update", formData);
      setUser(res.data.data);
      setSuccessMsg("Profile update ho gayi!");
      setPhase("view");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Update fail ho gaya.");
      setPhase("editing");
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/logout");
    } catch (err) {
      // Backend call fail bhi ho jaaye, phir bhi Login page bhej do
    }
    navigate("/Login");
  };

  const getInputClass = (fieldName) =>
    `w-full px-4 py-2.5 text-sm bg-[#1F2937] border rounded-lg outline-none transition-colors text-white placeholder-gray-500 ${
      fieldErrors[fieldName]
        ? "border-red-500 focus:border-red-500"
        : "border-gray-700 focus:border-[#7C3AED]"
    }`;

  if (phase === "loading") return <ProfileSkeleton />;

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6 pb-24">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{errorMsg}</p>
          <button
            onClick={() => navigate("/HomePage")}
            className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
          >
            Home Jaayein
          </button>
        </div>
        <BottomNav navigate={navigate} />
      </div>
    );
  }

  const initial = (user?.name || "?").trim().charAt(0).toUpperCase();
  const isEditing = phase === "editing" || phase === "saving";

  return (
    // 👇 NAYA: pb-24 add kiya taaki fixed bottom nav content ko overlap na kare
    <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-10 pb-24">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => navigate("/HomePage")}
          className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1"
        >
          &larr; Home
        </button>

        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center text-2xl font-bold mb-4">
            {initial}
          </div>
          <h1 className="text-xl font-bold">{user.name}</h1>
          <span className="mt-2 text-xs px-3 py-1 rounded-full bg-[#7C3AED]/20 text-[#A78BFA]">
            {user.exam}
          </span>
        </div>

        {successMsg && (
          <div className="mb-5 p-3 bg-green-500/10 text-green-400 border border-green-500/30 rounded-xl text-xs font-medium text-center">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-5 p-3 bg-red-500/10 text-red-400 border border-red-500/30 rounded-xl text-xs font-medium text-center">
            {errorMsg}
          </div>
        )}

        {!isEditing && (
          <>
            <div className="bg-[#111827] border border-gray-800 rounded-2xl divide-y divide-gray-800 mb-6">
              {["email", "phone", "address", "exam"].map((field) => (
                <div key={field} className="px-6 py-4">
                  <p className="text-xs text-gray-500 mb-1">{FIELD_LABELS[field]}</p>
                  <p className="text-sm text-gray-100">{user[field]}</p>
                </div>
              ))}
            </div>

            <button
              onClick={startEdit}
              className="w-full py-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold mb-3"
            >
              Profile Edit Karein
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 font-medium"
            >
              Logout
            </button>
          </>
        )}

        {isEditing && (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">Full Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className={getInputClass("name")} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className={getInputClass("email")} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">Phone Number</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className={getInputClass("phone")} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">City / Address</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} className={getInputClass("address")} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">Exam Category</label>
              <select name="exam" value={formData.exam} onChange={handleChange} className={`${getInputClass("exam")} appearance-none cursor-pointer`}>
                <option value="" disabled>Select your exam</option>
                {examList.map((examName, i) => (
                  <option key={i} value={examName}>{examName}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={cancelEdit} disabled={phase === "saving"} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-sm text-gray-300">
                Cancel
              </button>
              <button onClick={handleSave} disabled={phase === "saving"} className="flex-1 py-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">
                {phase === "saving" ? "Save ho raha hai..." : "Changes Save Karein"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 👇 NAYA: HomePage jaisa bottom navigation */}
      <BottomNav navigate={navigate} />
    </div>
  );
};

export default ProfilePage;