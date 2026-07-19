import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import BottomNav from "../components/BottomNav";




const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const ProfileSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12 pb-24">
    <div className="max-w-lg mx-auto">
      <div className="flex flex-col items-center mb-10">
        <SkeletonBlock className="w-24 h-24 rounded-full mb-4" />
        <SkeletonBlock className="w-44 h-6 mb-2" />
        <SkeletonBlock className="w-32 h-5 rounded-full" />
      </div>
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 space-y-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1.5">
            <SkeletonBlock className="w-20 h-3" />
            <SkeletonBlock className="w-48 h-4" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const FIELD_CONFIG = [
  { key: "email",   label: "Email Address",  icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { key: "phone",   label: "Phone Number",   icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
  { key: "address", label: "City / Address", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" },
  { key: "exam",    label: "Exam Category",  icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
];

// // ── Bottom Nav — 4 buttons: Home, Mock Tests, Analysis, Profile ──
// const navBtnClass =
//   "flex flex-col items-center justify-center gap-1 w-1/4 transition-colors";

// const BottomNav = ({ navigate, activePage }) => {
//   const items = [
//     {
//       key: "home",
//       label: "Home",
//       route: "/HomePage",
//       icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
//     },
//     {
//       key: "mock",
//       label: "Mock Tests",
//       route: "/MockTest",
//       icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
//     },
//     {
//       key: "analysis",
//       label: "Analysis",
//       route: "/UserAllAnalysis",
//       icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
//     },
//     {
//       key: "profile",
//       label: "Profile",
//       route: "/ProfilePage",
//       icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
//     },
//   ];

//   return (
//     <nav className="fixed bottom-0 left-0 w-full h-[70px] bg-[#111827] border-t border-gray-800 flex justify-around items-center z-50">
//       {items.map((item) => {
//         const isActive = activePage === item.key;
//         return (
//           <button
//             key={item.key}
//             onClick={() => navigate(item.route)}
//             className={`${navBtnClass} ${isActive ? "text-[#A78BFA]" : "text-gray-400"}`}
//           >
//             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
//             </svg>
//             <span className="text-xs font-medium">{item.label}</span>
//           </button>
//         );
//       })}
//     </nav>
//   );
// };

const ProfilePage = () => {
  const navigate = useNavigate();

  const [phase, setPhase] = useState("loading");
  const [user, setUser] = useState(null);
  const [examList, setExamList] = useState([]);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "", exam: "" });
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
        if (err.response?.status === 401) { navigate("/Login"); return; }
        setErrorMsg(err.response?.data?.message || "Profile load nahi ho paayi.");
        setPhase("error");
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = () => {
    // 👇 FIX: Edit shuru karte waqt formData mein current user ka exam correctly set karo
    setFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || "",
      exam: user.exam || "",
    });
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
    try { await api.post("/logout"); } catch {}
    navigate("/Login");
  };

  const getInputClass = (fieldName) =>
    `w-full px-4 py-2.5 text-sm bg-[#0A0D14] border rounded-xl outline-none transition-colors text-white placeholder-gray-600 ${
      fieldErrors[fieldName]
        ? "border-red-500 focus:border-red-400"
        : "border-gray-700 focus:border-[#7C3AED]"
    }`;

  if (phase === "loading") return <ProfileSkeleton />;

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6 pb-24">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{errorMsg}</p>
          <button onClick={() => navigate("/HomePage")} className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">
            Home Jaayein
          </button>
        </div>
        <BottomNav navigate={navigate} activePage="profile" />
      </div>
    );
  }

  const initial = (user?.name || "?").trim().charAt(0).toUpperCase();
  const isEditing = phase === "editing" || phase === "saving";

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white pb-24">

      {/* ── Top gradient header ── */}
      <div className="bg-gradient-to-b from-[#1a0f3c] to-[#0A0D14] pt-12 pb-8 px-6 mb-2">
        <div className="max-w-lg mx-auto flex flex-col items-center">
          {/* Avatar */}
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center text-3xl font-bold shadow-lg shadow-purple-900/40 ring-4 ring-[#7C3AED]/30">
              {initial}
            </div>
            {/* online dot */}
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-[#0A0D14]" />
          </div>

          <h1 className="text-2xl font-bold mb-1">{user.name}</h1>
          <span className="text-xs px-3 py-1 rounded-full bg-[#7C3AED]/25 text-[#A78BFA] border border-[#7C3AED]/30">
            {user.exam}
          </span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6">

        {/* Toast messages */}
        {successMsg && (
          <div className="mb-5 p-3.5 bg-green-500/10 text-green-400 border border-green-500/25 rounded-xl text-sm font-medium text-center flex items-center justify-center gap-2">
            <span>✓</span> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-red-500/10 text-red-400 border border-red-500/25 rounded-xl text-sm font-medium text-center">
            {errorMsg}
          </div>
        )}

        {/* ── VIEW MODE ── */}
        {!isEditing && (
          <>
            {/* Info cards */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden mb-5 shadow-lg">
              {FIELD_CONFIG.map(({ key, label, icon }, idx) => (
                <div
                  key={key}
                  className={`flex items-center gap-4 px-5 py-4 ${idx !== FIELD_CONFIG.length - 1 ? "border-b border-gray-800" : ""}`}
                >
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-lg bg-[#7C3AED]/15 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[#A78BFA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="text-sm text-gray-100 truncate">{user[key]}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <button
              onClick={startEdit}
              className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold mb-3 transition-colors shadow-lg shadow-purple-900/20"
            >
              Profile Edit Karein
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-medium transition-colors"
            >
              Logout
            </button>
          </>
        )}

        {/* ── EDIT MODE ── */}
        {isEditing && (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-lg space-y-4">

            <h2 className="text-base font-semibold text-white mb-1">Edit Profile</h2>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                Full Name
              </label>
              <input
                type="text" name="name" value={formData.name}
                onChange={handleChange} placeholder="Aapka naam"
                className={getInputClass("name")}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                Email Address
              </label>
              <input
                type="email" name="email" value={formData.email}
                onChange={handleChange} placeholder="email@example.com"
                className={getInputClass("email")}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                Phone Number
              </label>
              <input
                type="text" name="phone" value={formData.phone}
                onChange={handleChange} placeholder="10 digit number"
                className={getInputClass("phone")}
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                City / Address
              </label>
              <input
                type="text" name="address" value={formData.address}
                onChange={handleChange} placeholder="Aapka sheher"
                className={getInputClass("address")}
              />
            </div>

            {/* Exam — 👇 FIX: value={formData.exam} correctly set ho raha hai ab */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                Exam Category
              </label>
              <div className="relative">
                <select
                  name="exam"
                  value={formData.exam}
                  onChange={handleChange}
                  className={`${getInputClass("exam")} appearance-none cursor-pointer pr-10`}
                >
                  {/* 👇 FIX: pehle ek empty disabled option nahi — agar exam selected hai to wahi show hoga */}
                  {examList.length === 0 && (
                    <option value="" disabled>Loading...</option>
                  )}
                  {examList.map((examName, i) => (
                    <option key={i} value={examName}>{examName}</option>
                  ))}
                </select>
                {/* Custom dropdown arrow */}
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={cancelEdit}
                disabled={phase === "saving"}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-sm text-gray-300 hover:border-gray-500 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={phase === "saving"}
                className="flex-1 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium transition-colors disabled:opacity-50"
              >
                {phase === "saving" ? "Save ho raha hai..." : "Save Karein"}
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;