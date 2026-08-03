import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";

// 👇 VERIFY: Routes.js mein addUser aur sendSignupOtp ke actual paths yahan match karo
const SIGNUP_ENDPOINT = "/signup";              // addUser controller ka route
const SEND_OTP_ENDPOINT = "/send-signup-otp";   // sendSignupOtp controller ka route (ye already confirm hai)

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  address: "",
  exam: "",
};

const Singup = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState("details"); // "details" | "otp"
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [examList, setExamList] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const [sendingOtp, setSendingOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const toastTimerRef = useRef(null);

  useEffect(() => {
    api
      .get("/allExamName")
      .then((res) => setExamList(res.data.data || []))
      .catch(() => {});
  }, []);

  // Resend-OTP cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const showToast = (msg) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(""), 3500);
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

  const validateDetails = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = true;
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) errors.email = true;
    if (formData.phone.length !== 10) errors.phone = true;
    if (formData.password.length < 6) errors.password = true;
    if (formData.confirmPassword !== formData.password) errors.confirmPassword = true;
    if (!formData.address.trim()) errors.address = true;
    if (!formData.exam) errors.exam = true;

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      showToast("Kripya highlighted fields sahi se bharein.");
      return false;
    }
    return true;
  };

  // ── STEP 1: Details validate karke OTP bhejo ──
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!validateDetails()) return;

    setSendingOtp(true);
    try {
      await api.post(SEND_OTP_ENDPOINT, { phone: formData.phone });
      showToast("OTP bhej diya gaya hai!");
      setStep("otp");
      setResendCooldown(60);
    } catch (err) {
      showToast(err.response?.data?.message || "OTP bhejte waqt error aaya.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setSendingOtp(true);
    try {
      await api.post(SEND_OTP_ENDPOINT, { phone: formData.phone });
      showToast("OTP dobara bhej diya gaya hai!");
      setResendCooldown(60);
    } catch (err) {
      showToast(err.response?.data?.message || "OTP bhejte waqt error aaya.");
    } finally {
      setSendingOtp(false);
    }
  };

  // ── STEP 2: OTP verify + account create (ek hi backend call mein) ──
  const handleVerifyAndSignup = async (e) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      showToast("6-digit OTP dalein.");
      return;
    }

    setVerifying(true);
    try {
      await api.post(SIGNUP_ENDPOINT, { ...formData, otp: otp.trim() });
      navigate("/HomePage");
    } catch (err) {
      showToast(err.response?.data?.message || "Signup fail ho gaya.");
    } finally {
      setVerifying(false);
    }
  };

  const changePhoneNumber = () => {
    setStep("details");
    setOtp("");
  };

  // ... (getInputClass function waisa hi rahega)
  // Border class nikalne ke liye chota helper function
  const getInputClass = (fieldName) => {
    const baseClass = "w-full pl-10 py-2 text-sm bg-white border rounded-lg outline-none transition-all placeholder-[#94A3B8]";
    const paddingRight = fieldName === 'password' || fieldName === 'confirmPassword' || fieldName === 'exam' ? 'pr-10' : 'pr-4';
    const errorClass = fieldErrors[fieldName] 
      ? "border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-red-50/10" 
      : "border-[#CBD5E1] focus:ring-2 focus:ring-[#2563EB]";
    return `${baseClass} ${paddingRight} ${errorClass}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row font-sans text-[#334155] relative">
      {/* ───────────────────────────────────────────── */}
      {/* CUSTOM TOAST NOTIFICATION                     */}
      {/* ───────────────────────────────────────────── */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 bg-white border-l-4 border-[#2563EB] shadow-xl px-6 py-4 rounded-lg flex items-center gap-3 transition-all duration-300">
          <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-sm font-semibold text-[#1E293B]">{toastMsg}</p>
        </div>
      )}

      {/* ───────────────────────────────────────────── */}
      {/* LEFT — Branding panel (desktop only)          */}
      {/* ───────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] text-white flex-col justify-center px-16">
        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center font-bold text-2xl mb-6">
          mt
        </div>
        <h1 className="text-3xl font-bold mb-3">mockTest.in mein Swagat Hai</h1>
        <p className="text-blue-100 text-sm leading-relaxed max-w-md">
          Sarkari exam ki taiyari ke liye best mock tests, previous year papers aur detailed performance analysis — sab ek hi jagah.
        </p>
      </div>

      {/* ───────────────────────────────────────────── */}
      {/* RIGHT — Form panel                            */}
      {/* ───────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 sm:p-8">
          <h2 className="text-xl font-bold text-[#1E293B] mb-1">
            {step === "details" ? "Account Banayein" : "Phone Verify Karein"}
          </h2>
          <p className="text-xs text-[#64748B] mb-6">
            {step === "details"
              ? "Apni details bharein, phone pe OTP bheja jayega"
              : `${formData.phone} pe bheja gaya 6-digit code dalein`}
          </p>

          {/* ══════════════ STEP 1: DETAILS FORM ══════════════ */}
          {step === "details" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${fieldErrors.name ? 'text-red-500' : 'text-[#475569]'}`}>
                  Full Name
                </label>
                <div className="relative">
                  <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.name ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </span>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Aapka naam" className={getInputClass('name')} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${fieldErrors.email ? 'text-red-500' : 'text-[#475569]'}`}>
                  Email
                </label>
                <div className="relative">
                  <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.email ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </span>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@example.com" className={getInputClass('email')} />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${fieldErrors.phone ? 'text-red-500' : 'text-[#475569]'}`}>
                  Phone Number
                </label>
                <div className="relative">
                  <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.phone ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  </span>
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="10 digit number" className={getInputClass('phone')} />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${fieldErrors.address ? 'text-red-500' : 'text-[#475569]'}`}>
                  City / Address
                </label>
                <div className="relative">
                  <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.address ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </span>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Aapka sheher" className={getInputClass('address')} />
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${fieldErrors.password ? 'text-red-500' : 'text-[#475569]'}`}>Password</label>
                  <div className="relative">
                    <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.password ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    </span>
                    <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required minLength="6" className={getInputClass('password')}/>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-[#475569]">
                      {showPassword ? (
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z" /></svg>
                      ) : (
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${fieldErrors.confirmPassword ? 'text-red-500' : 'text-[#475569]'}`}>Confirm Pass</label>
                  <div className="relative">
                    <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.confirmPassword ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    </span>
                    <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className={getInputClass('confirmPassword')} />
                  </div>
                </div>
              </div>

              {/* Exam */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${fieldErrors.exam ? 'text-red-500' : 'text-[#475569]'}`}>Exam Category</label>
                <div className="relative">
                  <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.exam ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </span>
                  <select name="exam" value={formData.exam} onChange={handleChange} className={`${getInputClass('exam')} appearance-none cursor-pointer`}>
                    <option value="" disabled>Exam chunein</option>
                    {examList.length > 0 ? (
                      examList.map((examName, index) => (
                        <option key={index} value={examName}>{examName}</option>
                      ))
                    ) : (
                      <option value="" disabled>Loading exams...</option>
                    )}
                  </select>
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#94A3B8]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={sendingOtp}
                className={`w-full py-2.5 mt-2 rounded-lg text-white font-semibold text-sm transition-all tracking-wide ${
                  sendingOtp ? 'bg-[#93C5FD] cursor-not-allowed' : 'bg-[#2563EB] hover:bg-[#1D4ED8] shadow-[0_4px_12px_rgba(37,99,235,0.2)]'
                }`}
              >
                {sendingOtp ? 'OTP Bheja Ja Raha Hai...' : 'OTP Bhejein'}
              </button>
            </form>
          )}

          {/* ══════════════ STEP 2: OTP VERIFY ══════════════ */}
          {step === "otp" && (
            <form onSubmit={handleVerifyAndSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-[#475569]">
                  6-Digit OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-4 py-2.5 text-center text-lg tracking-[0.5em] font-mono bg-white border border-[#CBD5E1] focus:ring-2 focus:ring-[#2563EB] rounded-lg outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={verifying}
                className={`w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-all tracking-wide ${
                  verifying ? 'bg-[#93C5FD] cursor-not-allowed' : 'bg-[#2563EB] hover:bg-[#1D4ED8] shadow-[0_4px_12px_rgba(37,99,235,0.2)]'
                }`}
              >
                {verifying ? 'Verify Ho Raha Hai...' : 'Verify Karein & Account Banayein'}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button type="button" onClick={changePhoneNumber} className="text-[#64748B] hover:text-[#334155]">
                  &larr; Number badlein
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || sendingOtp}
                  className={resendCooldown > 0 ? "text-[#94A3B8] cursor-not-allowed" : "text-[#2563EB] font-medium hover:underline"}
                >
                  {resendCooldown > 0 ? `Dobara bhejein (${resendCooldown}s)` : "OTP Dobara Bhejein"}
                </button>
              </div>
            </form>
          )}

          {/* Bottom Navigation Links */}
          <div className="mt-5 text-center text-xs text-[#64748B]">
            Already have an account?{' '}
            <Link to="/Login" className="text-[#2563EB] font-bold hover:underline ml-1">
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Singup;