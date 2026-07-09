import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api"; // 👈 Sahi path import karein

const UserAllAnalysis = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [examName, setExamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 🚀 API call 1: Me
        const meRes = await api.get("/me");
        const userExam = meRes.data.data.exam;
        setExamName(userExam);

        // 🚀 API call 2: Overview analysis
        const encodedExam = encodeURIComponent(userExam);
        const overviewRes = await api.get(`/analysis/overview/active_user/${encodedExam}`);
        
        setOverview(overviewRes.data.data);
      } catch (err) {
        // Axios error handling
        setError(err.response?.data?.message || err.message || "Data laane mein error aaya.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ... (Baaki UI code waisa hi rahega jaisa pehle tha)
  // Bas dhyan dein ki map aur data access wahi rahen (overviewRes.data.data)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-800 border-t-[#8B5CF6] rounded-full animate-spin mb-4" />
        <p className="text-gray-400 font-medium tracking-wide">Analysis data load ho raha hai...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center px-6">
        <div className="bg-[#111827] border border-red-500/30 p-8 rounded-2xl max-w-md text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold mb-2">Oops! Error Aaya</h2>
          <p className="text-gray-400 mb-6 text-sm">{error}</p>
          <button 
            onClick={() => navigate('/Login')}
            className="px-6 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg transition-colors text-sm font-medium"
          >
            Login Page Par Jaayein
          </button>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center px-6">
        <div className="bg-[#111827] border border-gray-800 p-8 rounded-2xl max-w-md text-center shadow-2xl">
          <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Koi Data Nahi Mila</h2>
          <p className="text-gray-400 mb-6 text-sm">Aapne abhi tak {examName} ka koi mock test nahi diya hai.</p>
          <button 
            onClick={() => navigate('/MockTest')}
            className="px-6 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg transition-colors text-sm font-medium"
          >
            Test Dena Shuru Karein
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white font-sans selection:bg-[#7C3AED] selection:text-white pb-16">
      
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto border-b border-gray-800">
        <div onClick={() => navigate('/HomePage')} className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center font-bold text-sm">
            mt
          </div>
          <span className="text-xl font-semibold tracking-wide">mockTest.in</span>
        </div>
        <button 
          onClick={() => navigate('/HomePage')}
          className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          &larr; Back to Home
        </button>
      </nav>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-6 mt-10 space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Detailed Analysis</h1>
          <p className="text-gray-400 mt-2 text-sm">Based on your performance in <span className="text-[#A78BFA] font-medium">{examName}</span> mocks.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-lg">
            <p className="text-sm text-gray-500 font-medium mb-1">Average Score (Last 3)</p>
            <p className="text-4xl font-bold text-[#A78BFA]">{overview.averageScore}%</p>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-lg">
            <p className="text-sm text-gray-500 font-medium mb-1">Total Mocks Attempted</p>
            <p className="text-4xl font-bold text-white">{overview.totalTestsGiven}</p>
          </div>
        </div>

        {/* Subject-wise Analysis Table */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="px-6 py-5 border-b border-gray-800 bg-[#1F2937]/30">
            <h3 className="font-semibold text-lg">Subject Analysis</h3>
            <p className="text-xs text-gray-500 mt-1">Last 3 mocks ka average data</p>
          </div>
          
          {overview.subjectAnalysis?.length === 0 ? (
            <div className="p-8 text-center text-yellow-500 bg-yellow-500/5">
              Subject analysis data khali hai. Apne agle mock ke baad check karein.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1A2235] text-gray-400 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-medium">Subject Name</th>
                    <th className="px-6 py-4 font-medium">Avg. Accuracy</th>
                    <th className="px-6 py-4 font-medium">Avg. Time (per Q)</th>
                    <th className="px-6 py-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {overview.subjectAnalysis?.map((s, i) => (
                    <tr key={i} className="hover:bg-[#1F2937]/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-200">{s.subjectName}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${s.averageAccuracy >= 70 ? 'bg-green-500/10 text-green-400' : s.averageAccuracy >= 40 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
                          {s.averageAccuracy}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">{s.averageTimePerQuestion} sec</td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {/* 🎯 NAYA LOGIC: Yahan hum state mein subjectName aur examName bhej rahe hain */}
                        <button 
                          onClick={() => navigate('/UserSubjectAnallysis', { 
                            state: { subjectName: s.subjectName, examName: examName } 
                          })}
                          className="text-[#8B5CF6] hover:text-white transition-colors font-medium text-xs flex items-center gap-1"
                        >
                          View Deep &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mock History */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="px-6 py-5 border-b border-gray-800 bg-[#1F2937]/30">
            <h3 className="font-semibold text-lg">Test History</h3>
            <p className="text-xs text-gray-500 mt-1">Aapke diye gaye sabhi mocks ka record</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1A2235] text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Score</th>
                  <th className="px-6 py-4 font-medium">Performance ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {overview.graphData?.map((g, i) => (
                  <tr key={i} className="hover:bg-[#1F2937]/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {new Date(g.date).toLocaleDateString("hi-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-white">{g.score}</td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-500">{String(g.performanceId)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserAllAnalysis;