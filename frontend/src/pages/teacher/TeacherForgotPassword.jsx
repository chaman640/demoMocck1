import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/api";

const REQUEST_OTP_ENDPOINT = "/teacher/request-reset-otp";
const RESET_PASSWORD_ENDPOINT = "/teacher/reset-password";

const TeacherForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState("email"); // "email" | "reset"
  const [email, setEmail] = useState("");
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

  const getInputClass = (fieldName) =>
    `w-full px-4 py-2.5 text-sm bg-[#0A0D14] border rounded-xl outline-none transition-colors text-white placeholder-gray-600 ${
      fieldErrors[fieldName] ? "border-red-500" : "border-gray-700 focus:border-[#7C3AED]"
    }`;

  // ── STEP 1: Email se OTP mangwana ──
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setFieldErrors({ email: true });
      showToast("Sahi email address dalein.");
      return;
    }
    setSendingOtp(true);
    try {
      await api.post(REQUEST_OTP_ENDPOINT, { email });
      showToast("OTP email par bhej diya gaya hai!");
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
      await api.post(REQUEST_OTP_ENDPOINT, { email });
      showToast("OTP dobara bhej diya gaya hai!");
      setResendCooldown(60);
    } catch (err) {
      showToast(err.response?.data?.message || "OTP bhejte waqt error aaya.");
    } finally {
      setSendingOtp(false);
    }
  };

  // ── STEP 2: OTP verify + naya password set ──
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
      await api.post(RESET_PASSWORD_ENDPOINT, { email, otp: otp.trim(), newPassword });
      showToast("Password reset ho gaya! Login karein.");
      setTimeout(() => navigate("/TeacherLogin"), 1200);
    } catch (err) {
      showToast(err.response?.data?.message || "Password reset nahi ho paaya.");
    } finally {
      setResetting(false);
    }
  };

  const changeEmail = () => {
    setStep("email");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setFieldErrors({});
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6 relative">
      {toastMsg && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 bg-[#111827] border border-gray-800 shadow-xl px-5 py-3 rounded-xl text-sm font-medium">
          {toastMsg}
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center font-bold text-lg mb-4">
            mt
          </div>
          <h1 className="text-2xl font-bold">{step === "email" ? "Password Bhool Gaye?" : "Naya Password Set Karein"}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {step === "email" ? "Apna registered email dalein, OTP bheja jayega" : `${email} pe bheja gaya OTP aur naya password dalein`}
          </p>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 sm:p-8">
          {step === "email" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: false }));
                    setEmail(e.target.value);
                  }}
                  placeholder="email@example.com"
                  className={getInputClass("email")}
                />
              </div>
              <button type="submit" disabled={sendingOtp} className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold transition-colors disabled:opacity-50">
                {sendingOtp ? "OTP Bheja Ja Raha Hai..." : "OTP Bhejein"}
              </button>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">6-Digit OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    if (fieldErrors.otp) setFieldErrors((prev) => ({ ...prev, otp: false }));
                    setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6));
                  }}
                  placeholder="123456"
                  className={`${getInputClass("otp")} text-center text-lg tracking-[0.5em] font-mono`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">Naya Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      if (fieldErrors.newPassword) setFieldErrors((prev) => ({ ...prev, newPassword: false }));
                      setNewPassword(e.target.value);
                    }}
                    placeholder="••••••••"
                    className={`${getInputClass("newPassword")} pr-10`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300">
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: false }));
                    setConfirmPassword(e.target.value);
                  }}
                  placeholder="••••••••"
                  className={getInputClass("confirmPassword")}
                />
              </div>

              <button type="submit" disabled={resetting} className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold transition-colors disabled:opacity-50">
                {resetting ? "Reset Ho Raha Hai..." : "Password Reset Karein"}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button type="button" onClick={changeEmail} className="text-gray-500 hover:text-gray-300">&larr; Email badlein</button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || sendingOtp}
                  className={resendCooldown > 0 ? "text-gray-600 cursor-not-allowed" : "text-[#A78BFA] font-medium hover:underline"}
                >
                  {resendCooldown > 0 ? `Dobara bhejein (${resendCooldown}s)` : "OTP Dobara Bhejein"}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-xs text-gray-500 mt-6">
            Yaad aa gaya password?{" "}
            <Link to="/TeacherLogin" className="text-[#A78BFA] font-medium hover:underline">
              Login Karein
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TeacherForgotPassword;
