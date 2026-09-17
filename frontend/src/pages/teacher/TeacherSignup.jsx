import React from "react";
import { Link } from "react-router-dom";

// 🆕 CHANGE — Main Teacher self-signup band kar diya gaya hai. Ab sirf
// Admin naya Main Teacher bana sakta hai (email invite ke through). Ye
// page ab sirf ek clear message dikhata hai, purana signup form hata diya.
const TeacherSignup = () => {
  return (
    <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-[#7C3AED]/10 text-[#A78BFA] flex items-center justify-center text-2xl mb-5">
          🔒
        </div>
        <h1 className="text-xl font-bold mb-2">Signup Admin Ke Through Hota Hai</h1>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          Naya Main Teacher account khud signup nahi kar sakta — admin se contact karein, wo aapke email par ek invite link bhej denge jisse aap apna account activate kar sakte hain.
        </p>
        <p className="text-xs text-gray-500 mb-1">Pehle se account hai?</p>
        <Link to="/TeacherLogin" className="inline-block px-6 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold text-sm transition-colors">
          Teacher Login
        </Link>
      </div>
    </div>
  );
};

export default TeacherSignup;
