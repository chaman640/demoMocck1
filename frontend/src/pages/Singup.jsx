import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Singup = () => {
  const navigate = useNavigate();
  const [examList, setExamList] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '', 
    address: '',
    exam: ''
  });

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({}); // 👈 Field-specific errors ke liye naya state
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(''); 

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/allExamName');
        const data = await response.json();
        if (data.success) {
          setExamList(data.data);
        }
      } catch (err) {
        console.error("Exams fetch error:", err);
      }
    };
    fetchExams();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Type karte hi us field ka red error hat jayega
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: false });
    }

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
    setFieldErrors({}); // Purane errors reset karein

    // 1. Phone Number Validation
    if (formData.phone.length !== 10) {
      setFieldErrors({ phone: true });
      return setError("Phone number bilkul 10 anko (digits) ka hona chahiye!");
    }

    // 2. Password Match Validation
    if (formData.password !== formData.confirmPassword) {
      setFieldErrors({ password: true, confirmPassword: true });
      return setError("Passwords match nahi kar rahe hain!");
    }
    
    // 3. Exam Category Validation
    if (!formData.exam) {
      setFieldErrors({ exam: true });
      return setError("Kripya ek Exam Category select karein!");
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/add-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', 
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          address: formData.address,
          exam: formData.exam
        })
      });

      const data = await response.json();
      
      if (data.success) {
        navigate('/MockTest');
      } else {
        const errorMsg = data.message.toLowerCase();
        
        // Agar account pehle se hai toh Email aur Phone dono red honge
        if (errorMsg.includes("pehle hi bana hua") || errorMsg.includes("already")) {
          setFieldErrors({ email: true, phone: true });
          setToastMsg("Account pehle se majood hai. Login page par le ja rahe hain...");
          setTimeout(() => {
            navigate('/Login');
          }, 3000); 
        } else {
          setError(data.message || "Signup me gadbadi hui.");
        }
      }
    } catch (err) {
      setError("Server se connect nahi ho pa raha hai.");
    } finally {
      setLoading(false);
    }
  };

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
      {/* LEFT COLUMN (PC View Only - Image & Features) */}
      {/* ───────────────────────────────────────────── */}
      <div className="hidden lg:flex w-full lg:w-1/2 flex-col justify-between p-12 bg-transparent">
        
        <div className="flex items-center gap-2 mb-8 self-start fixed top-8 left-12">
          <img src="https://res.cloudinary.com/drbsogdpu/image/upload/v1783332369/3e237e9d-403d-4fb9-a12d-6f6eb6c97c13-removebg-preview_pqgchm.png" alt="mockTest.in Logo" className="w-7 h-7 object-contain"/>
          <span className="text-xl font-bold tracking-tight text-[#0F172A]">mockTest.in</span>
        </div>

        <div className="flex flex-col items-center text-center max-w-xl mx-auto mt-24">
          <h1 className="text-4xl font-extrabold text-[#0F172A] tracking-tight mb-3">Start Your Success Journey!</h1>
          <p className="text-lg text-[#64748B] mb-8 font-normal px-4">Join thousand of students preparing for their exams with mockTest.in.</p>
          <div className="w-full max-w-[420px] px-4 aspect-[4/3] flex items-center justify-center">
            <img src="https://res.cloudinary.com/drbsogdpu/image/upload/v1783256456/Screenshot_from_2026-07-05_18-29-52_mzctrf.png" alt="Student Studying" className="w-full h-full object-contain mix-blend-multiply"/>
          </div>
        </div>

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
      {/* RIGHT COLUMN (Signup Form & Mobile Header)    */}
      {/* ───────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12 min-h-screen lg:min-h-0">
        
        <div className="flex lg:hidden flex-col items-center mb-6 mt-4">
          <img src="https://res.cloudinary.com/drbsogdpu/image/upload/v1783332369/3e237e9d-403d-4fb9-a12d-6f6eb6c97c13-removebg-preview_pqgchm.png" alt="mockTest.in Logo" className="w-16 h-16 object-contain mb-2"/>
          <p className="text-sm text-[#64748B] mb-6 font-normal px-4 text-center">Start Your Success Journey!</p>
          <div className="w-full max-w-[280px] aspect-[4/3] flex items-center justify-center mb-4">
            <img src="https://res.cloudinary.com/drbsogdpu/image/upload/v1783256456/Screenshot_from_2026-07-05_18-29-52_mzctrf.png" alt="Student Studying" className="w-full h-full object-contain mix-blend-multiply"/>
          </div>
        </div>

        <div className="w-full max-w-[460px] bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] p-6 sm:p-8">
          
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Create Your Free Account</h2>
            <p className="text-[#64748B] text-xs sm:text-sm mt-1">Fill in the details to register</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2] rounded-xl text-xs font-medium text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${fieldErrors.name ? 'text-red-500' : 'text-[#475569]'}`}>Full Name</label>
              <div className="relative">
                <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.name ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                </span>
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g., Aryan Sharma" required className={getInputClass('name')}/>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${fieldErrors.email ? 'text-red-500' : 'text-[#475569]'}`}>Email Address</label>
              <div className="relative">
                <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.email ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </span>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="e.g., aryan@email.com" required className={getInputClass('email')}/>
              </div>
            </div>

            {/* Phone & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${fieldErrors.phone ? 'text-red-500' : 'text-[#475569]'}`}>Phone Number</label>
                <div className="relative">
                  <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.phone ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                  </span>
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="9876543210" required className={getInputClass('phone')}/>
                </div>
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${fieldErrors.address ? 'text-red-500' : 'text-[#475569]'}`}>City / Address</label>
                <div className="relative">
                  <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.address ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  </span>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="e.g., Prayagraj, UP" required className={getInputClass('address')}/>
                </div>
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
                  <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required className={getInputClass('confirmPassword')}/>
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-[#475569]">
                    {showConfirmPassword ? (
                      <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z" /></svg>
                    ) : (
                      <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Exam Category */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${fieldErrors.exam ? 'text-red-500' : 'text-[#475569]'}`}>Select Exam Category</label>
              <div className="relative">
                <span className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none ${fieldErrors.exam ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </span>
                
                <select name="exam" value={formData.exam} onChange={handleChange} required className={`${getInputClass('exam')} appearance-none cursor-pointer`}>
                  <option value="" disabled>Select your exam</option>
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
              disabled={loading}
              className={`w-full py-2.5 mt-2 rounded-lg text-white font-semibold text-sm transition-all tracking-wide ${
                loading ? 'bg-[#93C5FD] cursor-not-allowed' : 'bg-[#2563EB] hover:bg-[#1D4ED8] shadow-[0_4px_12px_rgba(37,99,235,0.2)]'
              }`}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

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