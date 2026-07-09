import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/api"; // 👈 Sahi import

const UserSubjectAnallysis = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeExamName, setActiveExamName] = useState("");

  const subjectNameFromState = location.state?.subjectName;
  const examNameFromState = location.state?.examName;

  useEffect(() => {
    if (!subjectNameFromState) {
      navigate('/UserAllAnalysis');
      return;
    }

    const fetchSubjectAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);

        let currentExam = examNameFromState;

        // Agar exam name state mein nahi hai, toh fetch karo
        if (!currentExam) {
          const meRes = await api.get("/me");
          currentExam = meRes.data.data.exam;
        }
        
        setActiveExamName(currentExam);

        const examEncoded = encodeURIComponent(currentExam);
        const subjectEncoded = encodeURIComponent(subjectNameFromState);
        
        // 🚀 Axios ka use (API instance automatically baseURL handle karega)
        const res = await api.get(`/analysis/subject/active_user/${examEncoded}/${subjectEncoded}`);

        setData(res.data.data); // 👈 res.data ka use
      } catch (err) {
        // 🚀 Axios error handling
        setError(err.response?.data?.message || "Data laane mein error aaya.");
      } finally {
        setLoading(false);
      }
    };

    fetchSubjectAnalysis();
  }, [subjectNameFromState, examNameFromState, navigate]);

  // ... (Baaki UI code waisa hi rahega)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-800 border-t-[#8B5CF6] rounded-full animate-spin mb-4" />
        <p className="text-gray-400 font-medium tracking-wide">Fetching {subjectNameFromState} Data...</p>
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
          <h2 className="text-xl font-bold mb-2">Oops! Error</h2>
          <p className="text-gray-400 mb-6 text-sm">{error}</p>
          <button 
            onClick={() => navigate('/UserAllAnalysis')}
            className="px-6 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg transition-colors text-sm font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white font-sans pb-16">
      
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto border-b border-gray-800">
        <div onClick={() => navigate('/HomePage')} className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center font-bold text-sm">
            mt
          </div>
          <span className="text-xl font-semibold tracking-wide">mockTest.in</span>
        </div>
        <button 
          onClick={() => navigate('/UserAllAnalysis')}
          className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          &larr; Back to Overview
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 mt-10 space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subject Analysis — <span className="text-[#A78BFA]">{data.subjectName}</span></h1>
          <p className="text-gray-400 mt-2 text-sm">Deep dive into your performance for this subject based on the last 3 mocks.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-lg">
            <p className="text-sm text-gray-500 font-medium mb-1">Average Accuracy</p>
            <p className="text-3xl font-bold text-[#10B981]">{data.averageAccuracy}%</p>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-lg">
            <p className="text-sm text-gray-500 font-medium mb-1">Avg Time / Question</p>
            <p className="text-3xl font-bold text-[#3B82F6]">{data.averageTimePerQuestion}s</p>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-lg">
            <p className="text-sm text-gray-500 font-medium mb-1">Mocks Considered</p>
            <p className="text-3xl font-bold text-white">{data.totalTestsConsidered}</p>
          </div>
        </div>

        {/* Topic-wise Efficiency (Updated) */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="px-6 py-5 border-b border-gray-800 bg-[#1F2937]/30">
            <h3 className="font-semibold text-lg">Topic-wise Efficiency</h3>
            <p className="text-xs text-gray-500 mt-1">{data.topicList?.length || 0} topics covered in this subject</p>
          </div>

          {data.topicList?.length === 0 ? (
            <p className="p-6 text-sm text-yellow-500">No topic data available for this subject.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1A2235] text-gray-400 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-medium">Topic</th>
                    <th className="px-6 py-4 font-medium">Efficiency</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {data.topicList?.map((t, i) => (
                    <tr key={i} className="hover:bg-[#1F2937]/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-200">{t.topicName}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${t.efficiency >= 70 ? 'text-green-400 bg-green-500/10' : t.efficiency >= 40 ? 'text-yellow-400 bg-yellow-500/10' : 'text-red-400 bg-red-500/10'}`}>
                          {t.efficiency}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        {/* 🎯 NAYA BUTTON Jisse Topic Analysis par jayenge */}
                        <button 
                          onClick={() => navigate('/UserTopicAnalysis', {
                            state: {
                              examName: activeExamName,
                              subjectName: data.subjectName,
                              topicName: t.topicName
                            }
                          })}
                          className="px-4 py-1.5 bg-[#1F2937] hover:bg-[#374151] border border-gray-700 rounded-lg text-[#A78BFA] text-xs font-medium transition-colors"
                        >
                          Deep Research &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top 5 Weak Topics */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="px-6 py-5 border-b border-gray-800 bg-red-900/10">
            <h3 className="font-semibold text-lg text-red-400">Top Weak Topics (Needs Attention)</h3>
            <p className="text-xs text-gray-500 mt-1">Focus on these areas to improve your score</p>
          </div>

          {data.weakTopics?.length === 0 ? (
            <p className="p-6 text-sm text-green-400">Great job! No specific weak topics detected.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1A2235] text-gray-400 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-medium">Topic</th>
                    <th className="px-6 py-4 font-medium">Efficiency</th>
                    <th className="px-6 py-4 font-medium">Wrong Answers</th>
                    <th className="px-6 py-4 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {data.weakTopics?.map((t, i) => (
                    <tr key={i} className={`${i === 0 ? 'bg-red-500/5' : 'hover:bg-[#1F2937]/50'} transition-colors`}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-200">{t.topicName}</td>
                      <td className="px-6 py-4 text-sm text-red-400">{t.efficiency}%</td>
                      <td className="px-6 py-4 text-sm font-semibold text-red-500">{t.wrongCount}</td>
                      <td className="px-6 py-4 text-xs text-red-300/80">{t.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default UserSubjectAnallysis;