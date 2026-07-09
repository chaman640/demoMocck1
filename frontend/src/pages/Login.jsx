import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(''); 

  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Type karte hi red error outline hat jayegi
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: false });
    }
    setError('');

    // Phone me sirf numbers aur max 10 digits
    if (name === 'phone') {
      const onlyNums = value.replace(/[^0-9]/g, '');
      if (onlyNums.length <= 10) {
        setFormData({ ...formData, [name]: onlyNums });
      }
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Phone Validation
    if (formData.phone.length !== 10) {
      setFieldErrors({ phone: true });
      return setError("Phone number bilkul 10 anko (digits) ka hona chahiye!");
    }
    if (!formData.password) {
      setFieldErrors({ password: true });
      return setError("Kripya apna password darj karein!");
    }

    setLoading(true);
    try {
      // Backend par login request (route: /api/user-Login)
      const response = await fetch('http://localhost:5000/api/user-Login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // JWT Cookie set karne ke liye zaroori
        body: JSON.stringify({
          phone: formData.phone,
          password: formData.password
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setToastMsg("Login Successful! Redirecting...");
        setTimeout(() => {
          navigate('/MockTest');
        }, 1500); // 1.5s delay to show success toast
      } else {
        // Backend se aane wale messages ke hisaab se specific field red karein
        const errorMsg = data.message.toLowerCase();
        if (errorMsg.includes("account nahi mila")) {
          setFieldErrors({ phone: true });
        } else if (errorMsg.includes("galat password")) {
          setFieldErrors({ password: true });
        }
        setError(data.message || "Login fail ho gaya.");
      }
    } catch (err) {
      setError("Server se connect nahi ho pa raha hai.");
    } finally {
      setLoading(false);
    }
  };

  // Border class function (Same as Signup)
  const getInputClass = (fieldName) => {
    const baseClass = "w-full pl-10 py-2 text-sm bg-white border rounded-lg outline-none transition-all placeholder-[#94A3B8]";
    const paddingRight = fieldName === 'password' ? 'pr-10' : 'pr-4';
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
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 bg-white border-l-4 border-[#10B981] shadow-xl px-6 py-4 rounded-lg flex items-center gap-3 transition-all duration-300">
          <div className="w-8 h-8 rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#10B981]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <p className="text-sm font-semibold text-[#1E293B]">{toastMsg}</p>
        </div>
      )}

      {/* ───────────────────────────────────────────── */}
      {/* LEFT COLUMN (PC View Only - Image & Features) */}
      {/* ───────────────────────────────────────────── */}
      <div className="hidden lg:flex w-full lg:w-1/2 flex-col justify-between p-12 bg-transparent">
        
        {/* Top Header Logo */}
        <div className="flex items-center gap-2 mb-8 self-start fixed top-8 left-12">
          <img src="https://res.cloudinary.com/drbsogdpu/image/upload/v1783256635/Screenshot_from_2026-07-05_18-33-30_kg15w9.png" alt="mockTest.in Logo" className="w-7 h-7 object-contain"/>
          <span className="text-xl font-bold tracking-tight text-[#0F172A]">mockTest.in</span>
        </div>

        <div className="flex flex-col items-center text-center max-w-xl mx-auto mt-24">
          <h1 className="text-4xl font-extrabold text-[#0F172A] tracking-tight mb-3">Welcome Back!</h1>
          <p className="text-lg text-[#64748B] mb-8 font-normal px-4">Continue your preparation and track your success journey with mockTest.in.</p>
          <div className="w-full max-w-[420px] px-4 aspect-[4/3] flex items-center justify-center">
            <img src="https://res.cloudinary.com/drbsogdpu/image/upload/v1783256456/Screenshot_from_2026-07-05_18-29-52_mzctrf.png" alt="Student Studying" className="w-full h-full object-contain mix-blend-multiply"/>
          </div>
        </div>

        {/* Features (Same as Signup) */}
        <div className="w-full max-w-2xl mx-auto mt-12 mb-4">
          <div className="relative flex py-2 items-center justify-center mb-8">
            <div className="flex-grow border-t border-[#E2E8F0]"></div>
            <span className="flex-shrink mx-4 text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Key Features to Power Your Success</span>
            <div className="flex-grow border-t border-[#E2E8F0]"></div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-left px-2">
            <div className="flex flex-col items-start">
              <div className="w-10 h-10 rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#10B981] mb-3 border border-[#D1FAE5]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              </div>
              <h4 className="font-bold text-sm text-[#1E293B] mb-1">Comprehensive Coverage</h4>
              <p className="text-xs text-[#64748B] leading-relaxed">Access extensive practice resources for diverse exam types.</p>
            </div>
            <div className="flex flex-col items-start">
              <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6] mb-3 border border-[#DBEAFE]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z"/><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
              </div>
              <h4 className="font-bold text-sm text-[#1E293B] mb-1">Deep Analytics & Insights</h4>
              <p className="text-xs text-[#64748B] leading-relaxed">Track your progress and identify key improvement areas.</p>
            </div>
            <div className="flex flex-col items-start">
              <div className="w-10 h-10 rounded-full bg-[#FFF7ED] flex items-center justify-center text-[#F97316] mb-3 border border-[#FFEDD5]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <h4 className="font-bold text-sm text-[#1E293B] mb-1">Realistic Mock Test Series</h4>
              <p className="text-xs text-[#64748B] leading-relaxed">Simulate actual exam conditions with full-length tests.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────── */}
      {/* RIGHT COLUMN (Login Form & Mobile Header)     */}
      {/* ───────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12 min-h-screen lg:min-h-0">
        
        {/* Mobile Logo & Main Image */}
        <div className="flex lg:hidden flex-col items-center mb-6 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <img src="https://res.cloudinary.com/drbsogdpu/image/upload/v1783256635/Screenshot_from_2026-07-05_18-33-30_kg15w9.png" alt="mockTest.in Logo" className="w-8 h-8 object-contain"/>
            <span className="text-2xl font-bold tracking-tight text-[#0F172A]">mockTest.in</span>
          </div>
          <p className="text-sm text-[#64748B] mb-6 font-normal px-4 text-center">Welcome Back!</p>
          <div className="w-full max-w-[280px] aspect-[4/3] flex items-center justify-center mb-4">
            <img src="https://res.cloudinary.com/drbsogdpu/image/upload/v1783256456/Screenshot_from_2026-07-05_18-29-52_mzctrf.png" alt="Student Studying" className="w-full h-full object-contain mix-blend-multiply"/>
          </div>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-[460px] bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] p-6 sm:p-8">
          
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Log In to Your Account</h2>
            <p className="text-[#64748B] text-xs sm:text-sm mt-1">Enter your registered phone and password</p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2] rounded-xl text-xs font-medium text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Phone Input */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${fieldErrors.phone ? 'text-red-500' : 'text-[#475569]'}`}>Phone Number</label>
              <div className="relative">
                <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.phone ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                </span>
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="9876543210" required className={getInputClass('phone')}/>
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide flex justify-between ${fieldErrors.password ? 'text-red-500' : 'text-[#475569]'}`}>
                <span>Password</span>
                {/* Aap baad me yaha "Forgot Password?" ka link laga sakte hain */}
              </label>
              <div className="relative">
                <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.password ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </span>
                <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required className={getInputClass('password')}/>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-[#475569]">
                  {showPassword ? (
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z" /></svg>
                  ) : (
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 mt-4 rounded-lg text-white font-semibold text-sm transition-all tracking-wide ${
                loading ? 'bg-[#93C5FD] cursor-not-allowed' : 'bg-[#2563EB] hover:bg-[#1D4ED8] shadow-[0_4px_12px_rgba(37,99,235,0.2)]'
              }`}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          {/* Bottom Navigation Links */}
          <div className="mt-6 text-center text-xs text-[#64748B]">
            Don't have an account?{' '}
            <Link to="/Singup" className="text-[#2563EB] font-bold hover:underline ml-1">
              Sign Up
            </Link>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Login;