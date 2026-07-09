import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://localhost:5000/api";

const HomePage = () => {
  const navigate = useNavigate();
  const [averageScore, setAverageScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const encodedExamName = encodeURIComponent("UP Police Constable");
        const url = `${BASE_URL}/analysis/overview/active_user/${encodedExamName}`;

        const res = await fetch(url, {
          credentials: 'include',
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Backend se error aaya data lene mein.");
        }

        setAverageScore(json.data.averageScore);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const displayedScore = loading || error || averageScore === null ? "--" : `${averageScore}%`;

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white font-sans selection:bg-[#7C3AED] selection:text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto border-b border-gray-800">
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center font-bold text-sm">
            mt
          </div>
          <span className="text-xl font-semibold tracking-wide">mockTest.in</span>
        </div>
        <div className="md:hidden">
          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center mb-16">
          
          {/* Left Column */}
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Full Practice.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A78BFA] to-[#7C3AED]">
                Real Results.
              </span>
            </h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-md leading-relaxed">
              Take mock tests, analyze your performance and improve with detailed insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                // Yahan state mein mockType: "Full" bheja gaya hai
                onClick={() => navigate('/MockTest', { state: { mockType: "Full" } })}
                className="px-6 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Start Full Mock Test <span>&rarr;</span>
              </button>
              <button 
                // Yahan state mein mockType: "Mini" bheja gaya hai
                onClick={() => navigate('/MockTest', { state: { mockType: "Mini" } })}
                className="px-6 py-3 bg-transparent border border-gray-700 hover:border-gray-500 text-gray-300 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Start Mini Mock <span>&rarr;</span>
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-center">
            <h3 className="text-sm text-gray-400 mb-6 font-medium">Overall Performance</h3>
            <div className="flex flex-col sm:flex-row gap-8 items-center justify-center mb-8 w-full">
              
              <div className="relative w-48 h-48 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  <path className="text-gray-800" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-[#8B5CF6]" strokeDasharray="72, 100" strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-white">{displayedScore}</span>
                  <span className="text-sm text-gray-500 mt-1">Score</span>
                </div>
              </div>

            </div>

            <div className="w-full mt-4">
              <h3 className="text-xs text-gray-500 mb-3">Performance Overview</h3>
              <div className="w-full h-24 relative flex items-end">
                <svg className="w-full h-full preserve-aspect-ratio-none" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <path d="M0,25 Q10,15 20,20 T40,10 T60,18 T80,5 T100,12" fill="none" stroke="#8B5CF6" strokeWidth="1" />
                  <path d="M0,25 Q10,15 20,20 T40,10 T60,18 T80,5 T100,12 L100,30 L0,30 Z" fill="url(#gradient)" opacity="0.2" />
                  <defs>
                    <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity="1" />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <circle cx="20" cy="20" r="1.5" fill="#A78BFA" />
                  <circle cx="40" cy="10" r="1.5" fill="#A78BFA" />
                  <circle cx="60" cy="18" r="1.5" fill="#A78BFA" />
                  <circle cx="80" cy="5" r="1.5" fill="#A78BFA" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 py-8 border-y border-gray-800/50">
          <div className="flex gap-4 items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-purple-900/30 flex items-center justify-center text-purple-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h3 className="text-md font-semibold text-gray-100">Exam Focused</h3>
              <p className="text-xs text-gray-500">Topic-wise tests</p>
            </div>
          </div>
          <div className="flex gap-4 items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-green-900/30 flex items-center justify-center text-green-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <div>
              <h3 className="text-md font-semibold text-gray-100">Smart Analysis</h3>
              <p className="text-xs text-gray-500">Detailed insights</p>
            </div>
          </div>
          <div className="flex gap-4 items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-blue-900/30 flex items-center justify-center text-blue-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <div>
              <h3 className="text-md font-semibold text-gray-100">Track Progress</h3>
              <p className="text-xs text-gray-500">Measure growth</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8 mb-16 rounded-2xl bg-[#111827] border border-gray-800 shadow-lg">
          <div className="text-center">
            <p className="text-4xl font-bold text-white">10,000+</p>
            <p className="text-sm text-gray-500">Tests Attempted</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-white">95%</p>
            <p className="text-sm text-gray-500">Success Rate</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-white">50,000+</p>
            <p className="text-sm text-gray-500">Happy Students</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-white">4.9/5</p>
            <p className="text-sm text-gray-500">User Rating</p>
          </div>
        </div>

        <div className="py-12">
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-2xl font-bold">Explore Features</h2>
            <button className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
              View All <span>&rarr;</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div 
              onClick={() => navigate('/MockTest')}
              className="bg-[#111827] border border-gray-800 rounded-3xl p-6 cursor-pointer transition-all hover:-translate-y-1 hover:border-purple-500/50 group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#1F2937] flex items-center justify-center text-[#A78BFA] mb-4 group-hover:bg-purple-900/30">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              </div>
              <h3 className="text-lg font-bold mb-2">Mock Tests</h3>
              <p className="text-sm text-gray-400 mb-6 line-clamp-2">
                Take tests and challenge yourself with real exam pattern.
              </p>
              <div className="w-8 h-8 rounded-full bg-[#1F2937] flex items-center justify-center text-gray-400 group-hover:text-white group-hover:bg-purple-600 transition-colors">
                &rarr;
              </div>
            </div>

            <div 
              onClick={() => navigate('/AnalysisPage')}
              className="bg-[#111827] border border-gray-800 rounded-3xl p-6 cursor-pointer transition-all hover:-translate-y-1 hover:border-green-500/50 group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#1F2937] flex items-center justify-center text-[#10B981] mb-4 group-hover:bg-green-900/30">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <h3 className="text-lg font-bold mb-2">Analysis</h3>
              <p className="text-sm text-gray-400 mb-6 line-clamp-2">
                View your performance and get detailed analysis.
              </p>
              <div className="w-8 h-8 rounded-full bg-[#1F2937] flex items-center justify-center text-gray-400 group-hover:text-white group-hover:bg-green-600 transition-colors">
                &rarr;
              </div>
            </div>

            <div 
              onClick={() => navigate('/ProfilePage')}
              className="bg-[#111827] border border-gray-800 rounded-3xl p-6 cursor-pointer transition-all hover:-translate-y-1 hover:border-blue-500/50 group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#1F2937] flex items-center justify-center text-[#3B82F6] mb-4 group-hover:bg-blue-900/30">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <h3 className="text-lg font-bold mb-2">Profile</h3>
              <p className="text-sm text-gray-400 mb-6 line-clamp-2">
                Manage your account and track your progress.
              </p>
              <div className="w-8 h-8 rounded-full bg-[#1F2937] flex items-center justify-center text-gray-400 group-hover:text-white group-hover:bg-blue-600 transition-colors">
                &rarr;
              </div>
            </div>
            
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 py-12 text-center flex flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center font-bold text-[10px]">
            mt
          </div>
          <span className="text-md font-semibold text-gray-300">mockTest.in</span>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;