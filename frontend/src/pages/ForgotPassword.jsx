import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";

const REQUEST_OTP_ENDPOINT = "/request-reset-otp";
const RESET_PASSWORD_ENDPOINT = "/reset-password";

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState("phone"); // "phone" | "reset"
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [toastMsg, setToastMsg] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const toastTimerRef = useRef(null);

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

  const handlePhoneChange = (e) => {
    if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: false }));
    setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10));
  };

  const getInputClass = (fieldName) => {
    const baseClass = "w-full pl-10 pr-4 py-2 text-sm bg-white border rounded-lg outline-none transition-all placeholder-[#94A3B8]";
    const errorClass = fieldErrors[fieldName]
      ? "border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-red-50/10"
      : "border-[#CBD5E1] focus:ring-2 focus:ring-[#2563EB]";
    return `${baseClass} ${errorClass}`;
  };

  // ── STEP 1: Phone se OTP mangwana ──
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (phone.length !== 10) {
      setFieldErrors({ phone: true });
      showToast("Sahi 10-digit phone number dalein.");
      return;
    }
    setSendingOtp(true);
    try {
      await api.post(REQUEST_OTP_ENDPOINT, { phone });
      showToast("OTP bhej diya gaya hai!");
      setStep("reset");
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
      await api.post(REQUEST_OTP_ENDPOINT, { phone });
      showToast("OTP dobara bhej diya gaya hai!");
      setResendCooldown(60);
    } catch (err) {
      showToast(err.response?.data?.message || "OTP bhejte waqt error aaya.");
    } finally {
      setSendingOtp(false);
    }
  };

  // ── STEP 2: OTP verify + naya password set (ek hi backend call mein) ──
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const errors = {};
    if (otp.trim().length !== 6) errors.otp = true;
    if (newPassword.length < 6) errors.newPassword = true;
    if (confirmPassword !== newPassword) errors.confirmPassword = true;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showToast("Kripya highlighted fields sahi se bharein.");
      return;
    }

    setResetting(true);
    try {
      await api.post(RESET_PASSWORD_ENDPOINT, {
        phone,
        otp: otp.trim(),
        newPassword,
      });
      showToast("Password reset ho gaya! Login karein.");
      setTimeout(() => navigate("/Login"), 1200);
    } catch (err) {
      showToast(err.response?.data?.message || "Password reset nahi ho paaya.");
    } finally {
      setResetting(false);
    }
  };

  const changePhoneNumber = () => {
    setStep("phone");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setFieldErrors({});
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row font-sans text-[#334155] relative">
      {toastMsg && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 bg-white border-l-4 border-[#2563EB] shadow-xl px-6 py-4 rounded-lg flex items-center gap-3 transition-all duration-300">
          <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-sm font-semibold text-[#1E293B]">{toastMsg}</p>
        </div>
      )}

      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] text-white flex-col justify-center px-16">
        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center font-bold text-2xl mb-6">
          mt
        </div>
        <h1 className="text-3xl font-bold mb-3">Password Reset Karein</h1>
        <p className="text-blue-100 text-sm leading-relaxed max-w-md">
          Chinta mat karein — apna phone verify karke naya password set kar sakte hain, chand seconds mein.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 sm:p-8">
          <h2 className="text-xl font-bold text-[#1E293B] mb-1">
            {step === "phone" ? "Password Bhool Gaye?" : "Naya Password Set Karein"}
          </h2>
          <p className="text-xs text-[#64748B] mb-6">
            {step === "phone"
              ? "Apna registered phone number dalein, OTP bheja jayega"
              : `${phone} pe bheja gaya OTP aur naya password dalein`}
          </p>

          {step === "phone" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${fieldErrors.phone ? 'text-red-500' : 'text-[#475569]'}`}>
                  Phone Number
                </label>
                <div className="relative">
                  <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.phone ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  </span>
                  <input
                    type="text"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="10 digit registered number"
                    className={getInputClass('phone')}
                  />
                </div>
              </div>

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

          {step === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${fieldErrors.otp ? 'text-red-500' : 'text-[#475569]'}`}>
                  6-Digit OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    if (fieldErrors.otp) setFieldErrors((prev) => ({ ...prev, otp: false }));
                    setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6));
                  }}
                  placeholder="123456"
                  className={`w-full px-4 py-2.5 text-center text-lg tracking-[0.5em] font-mono bg-white border rounded-lg outline-none transition-all ${
                    fieldErrors.otp ? "border-red-500 focus:ring-2 focus:ring-red-500" : "border-[#CBD5E1] focus:ring-2 focus:ring-[#2563EB]"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${fieldErrors.newPassword ? 'text-red-500' : 'text-[#475569]'}`}>
                  Naya Password
                </label>
                <div className="relative">
                  <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.newPassword ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      if (fieldErrors.newPassword) setFieldErrors((prev) => ({ ...prev, newPassword: false }));
                      setNewPassword(e.target.value);
                    }}
                    placeholder="••••••••"
                    className={`${getInputClass('newPassword')} pr-10`}
                  />
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
                <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${fieldErrors.confirmPassword ? 'text-red-500' : 'text-[#475569]'}`}>
                  Confirm Password
                </label>
                <div className="relative">
                  <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.confirmPassword ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: false }));
                      setConfirmPassword(e.target.value);
                    }}
                    placeholder="••••••••"
                    className={getInputClass('confirmPassword')}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={resetting}
                className={`w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-all tracking-wide ${
                  resetting ? 'bg-[#93C5FD] cursor-not-allowed' : 'bg-[#2563EB] hover:bg-[#1D4ED8] shadow-[0_4px_12px_rgba(37,99,235,0.2)]'
                }`}
              >
                {resetting ? 'Reset Ho Raha Hai...' : 'Password Reset Karein'}
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

          <div className="mt-5 text-center text-xs text-[#64748B]">
            Yaad aa gaya password?{' '}
            <Link to="/Login" className="text-[#2563EB] font-bold hover:underline ml-1">
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;